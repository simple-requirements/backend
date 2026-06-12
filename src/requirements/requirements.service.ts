import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import type { RequirementRevisionResponseDto } from '@/requirements/dto/requirement-revision-response.dto';
import type { UpdateRequirementDto } from '@/requirements/dto/update-requirement.dto';
import { RequirementRevision } from '@/requirements/requirement-revision.entity';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { Requirement } from '@/requirements/requirements.entity';

const VISIBLE_KEY_PATTERN = /^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMMUTABLE_UPDATE_FIELDS = ['id', 'visibleKey', 'type', 'kind', 'categoryId', 'sequenceNumber', 'status'] as const;

@Injectable()
export class RequirementsService {
    constructor(
        @InjectRepository(Requirement)
        private readonly requirementsRepository: Repository<Requirement>,
        @InjectRepository(RequirementRevision)
        private readonly requirementRevisionsRepository: Repository<RequirementRevision>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly requirementsKeyAllocatorService: RequirementsKeyAllocatorService,
    ) {}

    async create(createRequirementDto: CreateRequirementDto): Promise<RequirementResponseDto> {
        this.validateCreateRequirementDto(createRequirementDto);

        const allocation = await this.requirementsKeyAllocatorService.allocate(
            createRequirementDto.type,
            createRequirementDto.categoryId,
        );

        const requirement = await this.requirementsRepository.findOne({ where: { id: allocation.id } });

        if (requirement === null) {
            throw new NotFoundException(`Requirement "${allocation.id}" was not found after key allocation`);
        }

        requirement.status = RequirementStatus.Draft;
        requirement.description = createRequirementDto.description.trim();
        requirement.priority = createRequirementDto.priority.trim();
        requirement.owner = this.toOptionalTrimmedString(createRequirementDto.owner);
        requirement.rationale = this.toOptionalTrimmedString(createRequirementDto.rationale);
        requirement.source = this.toOptionalTrimmedString(createRequirementDto.source);

        return this.toResponseDto(await this.requirementsRepository.save(requirement));
    }

    async findAll(): Promise<RequirementResponseDto[]> {
        const requirements = await this.requirementsRepository.find({ order: { visibleKey: 'ASC' } });

        return requirements.map((requirement) => this.toResponseDto(requirement));
    }

    async findOne(id: string): Promise<RequirementResponseDto> {
        const requirement = await this.requirementsRepository.findOne({ where: { id } });

        if (requirement === null) {
            throw new NotFoundException(`Requirement "${id}" was not found`);
        }

        return this.toResponseDto(requirement);
    }

    async findByVisibleKey(visibleKey: string): Promise<RequirementResponseDto> {
        if (typeof visibleKey !== 'string' || !VISIBLE_KEY_PATTERN.test(visibleKey)) {
            throw new BadRequestException('Requirement visible key must match FR-KEY-0001 or NFR-KEY-0001');
        }

        const requirement = await this.requirementsRepository.findOne({ where: { visibleKey } });

        if (requirement === null) {
            throw new NotFoundException(`Requirement "${visibleKey}" was not found`);
        }

        return this.toResponseDto(requirement);
    }

    async update(id: string, updateRequirementDto: UpdateRequirementDto): Promise<RequirementResponseDto> {
        this.validateRequirementId(id);
        this.validateUpdateRequirementDto(updateRequirementDto);

        return this.dataSource.transaction(async (manager) => {
            const requirement = await manager.findOne(Requirement, {
                where: { id },
                lock: { mode: 'pessimistic_write' },
            });

            if (requirement === null) {
                throw new NotFoundException(`Requirement "${id}" was not found`);
            }

            const latestRevision = await manager.findOne(RequirementRevision, {
                where: { requirementId: requirement.id },
                order: { revisionNumber: 'DESC' },
                lock: { mode: 'pessimistic_write' },
            });
            const revision = manager.create(RequirementRevision, {
                requirementId: requirement.id,
                revisionNumber: (latestRevision?.revisionNumber ?? 0) + 1,
                visibleKey: requirement.visibleKey,
                type: requirement.type,
                categoryId: requirement.categoryId,
                sequenceNumber: requirement.sequenceNumber,
                status: requirement.status,
                description: requirement.description,
                priority: requirement.priority,
                owner: requirement.owner,
                rationale: requirement.rationale,
                source: requirement.source,
                requirementCreatedAt: requirement.createdAt,
                requirementUpdatedAt: requirement.updatedAt,
            });

            await manager.save(RequirementRevision, revision);

            if (updateRequirementDto.description !== undefined) {
                requirement.description = updateRequirementDto.description.trim();
            }

            if (updateRequirementDto.priority !== undefined) {
                requirement.priority = updateRequirementDto.priority.trim();
            }

            if (updateRequirementDto.owner !== undefined) {
                requirement.owner = this.toOptionalTrimmedString(updateRequirementDto.owner);
            }

            if (updateRequirementDto.rationale !== undefined) {
                requirement.rationale = this.toOptionalTrimmedString(updateRequirementDto.rationale);
            }

            if (updateRequirementDto.source !== undefined) {
                requirement.source = this.toOptionalTrimmedString(updateRequirementDto.source);
            }

            return this.toResponseDto(await manager.save(Requirement, requirement));
        });
    }

    async findRevisionHistory(id: string): Promise<RequirementRevisionResponseDto[]> {
        this.validateRequirementId(id);
        await this.ensureRequirementExists(id);

        const revisions = await this.requirementRevisionsRepository.find({
            where: { requirementId: id },
            order: { revisionNumber: 'ASC' },
        });

        return revisions.map((revision) => this.toRevisionResponseDto(revision));
    }

    async findRevision(id: string, revisionNumber: number): Promise<RequirementRevisionResponseDto> {
        this.validateRequirementId(id);

        if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
            throw new BadRequestException('Requirement revision number must be a positive integer');
        }

        await this.ensureRequirementExists(id);

        const revision = await this.requirementRevisionsRepository.findOne({
            where: { requirementId: id, revisionNumber },
        });

        if (revision === null) {
            throw new NotFoundException(`Requirement "${id}" revision ${revisionNumber} was not found`);
        }

        return this.toRevisionResponseDto(revision);
    }

    private async ensureRequirementExists(id: string): Promise<void> {
        const requirement = await this.requirementsRepository.findOne({ where: { id } });

        if (requirement === null) {
            throw new NotFoundException(`Requirement "${id}" was not found`);
        }
    }

    private validateCreateRequirementDto(createRequirementDto: CreateRequirementDto): void {
        if (typeof createRequirementDto !== 'object' || createRequirementDto === null) {
            throw new BadRequestException('Requirement request body is required');
        }

        if (!Object.values(RequirementType).includes(createRequirementDto.type)) {
            throw new BadRequestException('Requirement type must be FR or NFR');
        }

        this.validateRequiredString(createRequirementDto.categoryId, 'Requirement category id is required');

        if (!UUID_PATTERN.test(createRequirementDto.categoryId)) {
            throw new BadRequestException('Requirement category id must be a valid UUID');
        }
        this.validateRequiredString(createRequirementDto.description, 'Requirement description is required');
        this.validateRequiredString(createRequirementDto.priority, 'Requirement priority is required', 40);
        this.validateOptionalString(
            createRequirementDto.owner,
            'Requirement owner must be a string when provided',
            120,
        );
        this.validateOptionalString(
            createRequirementDto.rationale,
            'Requirement rationale must be a string when provided',
        );
        this.validateOptionalString(createRequirementDto.source, 'Requirement source must be a string when provided');
    }

    private validateUpdateRequirementDto(updateRequirementDto: UpdateRequirementDto): void {
        if (typeof updateRequirementDto !== 'object' || updateRequirementDto === null) {
            throw new BadRequestException('Requirement request body is required');
        }

        const suppliedFields = Object.keys(updateRequirementDto);

        for (const immutableField of IMMUTABLE_UPDATE_FIELDS) {
            if (immutableField in updateRequirementDto) {
                throw new BadRequestException(`Requirement ${immutableField} cannot be changed`);
            }
        }

        if (
            !suppliedFields.some((field) => ['description', 'priority', 'owner', 'rationale', 'source'].includes(field))
        ) {
            throw new BadRequestException('At least one editable requirement field is required');
        }

        if (updateRequirementDto.description !== undefined) {
            this.validateRequiredString(updateRequirementDto.description, 'Requirement description is required');
        }

        if (updateRequirementDto.priority !== undefined) {
            this.validateRequiredString(updateRequirementDto.priority, 'Requirement priority is required', 40);
        }

        this.validateOptionalString(
            updateRequirementDto.owner,
            'Requirement owner must be a string when provided',
            120,
        );
        this.validateOptionalString(
            updateRequirementDto.rationale,
            'Requirement rationale must be a string when provided',
        );
        this.validateOptionalString(updateRequirementDto.source, 'Requirement source must be a string when provided');
    }

    private validateRequiredString(value: unknown, requiredMessage: string, maxLength?: number): void {
        if (typeof value !== 'string' || value.trim() === '') {
            throw new BadRequestException(requiredMessage);
        }

        if (maxLength !== undefined && value.trim().length > maxLength) {
            throw new BadRequestException(
                `${requiredMessage.replace(' is required', '')} must be no longer than ${maxLength} characters`,
            );
        }
    }

    private validateOptionalString(value: unknown, typeMessage: string, maxLength?: number): void {
        if (value === undefined || value === null) {
            return;
        }

        if (typeof value !== 'string') {
            throw new BadRequestException(typeMessage);
        }

        if (maxLength !== undefined && value.trim().length > maxLength) {
            throw new BadRequestException(
                `${typeMessage.replace(' must be a string when provided', '')} must be no longer than ${maxLength} characters`,
            );
        }
    }

    private validateRequirementId(id: string): void {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new BadRequestException('Requirement id is required');
        }

        if (!UUID_PATTERN.test(id)) {
            throw new BadRequestException('Requirement id must be a valid UUID');
        }
    }

    private toOptionalTrimmedString(value: string | null | undefined): string | null {
        if (value === undefined || value === null || value.trim() === '') {
            return null;
        }

        return value.trim();
    }

    private toResponseDto(requirement: Requirement): RequirementResponseDto {
        return {
            id: requirement.id,
            visibleKey: requirement.visibleKey,
            type: requirement.type,
            categoryId: requirement.categoryId,
            sequenceNumber: requirement.sequenceNumber,
            status: requirement.status,
            description: requirement.description ?? '',
            priority: requirement.priority ?? '',
            owner: requirement.owner,
            rationale: requirement.rationale,
            source: requirement.source,
            createdAt: requirement.createdAt.toISOString(),
            updatedAt: requirement.updatedAt.toISOString(),
        };
    }

    private toRevisionResponseDto(revision: RequirementRevision): RequirementRevisionResponseDto {
        return {
            id: revision.id,
            requirementId: revision.requirementId,
            revisionNumber: revision.revisionNumber,
            visibleKey: revision.visibleKey,
            type: revision.type,
            categoryId: revision.categoryId,
            sequenceNumber: revision.sequenceNumber,
            status: revision.status,
            description: revision.description ?? '',
            priority: revision.priority ?? '',
            owner: revision.owner,
            rationale: revision.rationale,
            source: revision.source,
            requirementCreatedAt: revision.requirementCreatedAt.toISOString(),
            requirementUpdatedAt: revision.requirementUpdatedAt.toISOString(),
            createdAt: revision.createdAt.toISOString(),
        };
    }
}
