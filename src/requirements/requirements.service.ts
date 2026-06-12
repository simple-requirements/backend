import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { MarkObsoleteRequirementDto } from '@/requirements/dto/mark-obsolete-requirement.dto';
import type { RejectRequirementDto } from '@/requirements/dto/reject-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import type { RequirementRevisionResponseDto } from '@/requirements/dto/requirement-revision-response.dto';
import type { UpdateRequirementDto } from '@/requirements/dto/update-requirement.dto';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';

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

    async findAll(includeRejected = false, includeObsolete = false): Promise<RequirementResponseDto[]> {
        const statuses = [RequirementStatus.Draft, RequirementStatus.Approved, RequirementStatus.Implemented];

        if (includeRejected) {
            statuses.push(RequirementStatus.Rejected);
        }

        if (includeObsolete) {
            statuses.push(RequirementStatus.Obsolete);
        }

        const requirements = await this.requirementsRepository.find({
            where: { status: In(statuses) },
            order: { visibleKey: 'ASC' },
        });

        return requirements.map((requirement) => this.toResponseDto(requirement));
    }

    async findOne(id: string): Promise<RequirementResponseDto> {
        const requirement = await this.findActiveOrRejectedRequirementById(id);

        return this.toResponseDto(requirement);
    }

    async findByVisibleKey(visibleKey: string): Promise<RequirementResponseDto> {
        if (typeof visibleKey !== 'string' || !VISIBLE_KEY_PATTERN.test(visibleKey)) {
            throw new BadRequestException('Requirement visible key must match FR-KEY-0001 or NFR-KEY-0001');
        }

        const requirement = await this.requirementsRepository.findOne({
            where: { visibleKey, status: Not(RequirementStatus.Deleted) },
        });

        if (requirement === null) {
            throw new NotFoundException(`Requirement "${visibleKey}" was not found`);
        }

        return this.toResponseDto(requirement);
    }

    async update(id: string, updateRequirementDto: UpdateRequirementDto): Promise<RequirementResponseDto> {
        this.validateRequirementId(id);
        this.validateUpdateRequirementDto(updateRequirementDto);

        return this.dataSource.transaction(async (manager) => {
            const requirement = await this.findRequirementForUpdate(manager, id);

            if (requirement.status !== RequirementStatus.Draft) {
                throw new ConflictException('Only draft requirements can be updated');
            }

            await this.createRevisionSnapshot(manager, requirement);

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

    async reject(id: string, rejectRequirementDto: RejectRequirementDto): Promise<RequirementResponseDto> {
        this.validateRequirementId(id);
        this.validateRejectRequirementDto(rejectRequirementDto);

        return this.dataSource.transaction(async (manager) => {
            const requirement = await this.findRequirementForUpdate(manager, id);

            if (requirement.status !== RequirementStatus.Draft) {
                throw new ConflictException('Only draft requirements can be rejected');
            }

            await this.createRevisionSnapshot(manager, requirement);

            requirement.status = RequirementStatus.Rejected;
            requirement.rejectionReason = rejectRequirementDto.rejectionReason.trim();
            requirement.reviewer = rejectRequirementDto.reviewer.trim();
            requirement.rejectedAt = new Date();

            return this.toResponseDto(await manager.save(Requirement, requirement));
        });
    }

    async approve(id: string): Promise<RequirementResponseDto> {
        return this.transitionRequirement(
            id,
            RequirementStatus.Draft,
            RequirementStatus.Approved,
            'Only draft requirements can be approved',
            (requirement) => {
                requirement.approvedAt = new Date();
            },
        );
    }

    async markImplemented(id: string): Promise<RequirementResponseDto> {
        return this.transitionRequirement(
            id,
            RequirementStatus.Approved,
            RequirementStatus.Implemented,
            'Only approved requirements can be marked implemented',
            (requirement) => {
                requirement.implementedAt = new Date();
            },
        );
    }

    async markObsolete(
        id: string,
        markObsoleteRequirementDto: MarkObsoleteRequirementDto,
    ): Promise<RequirementResponseDto> {
        this.validateMarkObsoleteRequirementDto(markObsoleteRequirementDto);

        return this.dataSource.transaction(async (manager) => {
            const requirement = await this.findRequirementForUpdate(manager, id);

            if (![RequirementStatus.Approved, RequirementStatus.Rejected].includes(requirement.status)) {
                throw new ConflictException('Only approved or rejected requirements can be marked obsolete');
            }

            await this.createRevisionSnapshot(manager, requirement);

            requirement.status = RequirementStatus.Obsolete;
            requirement.obsolescenceReason = markObsoleteRequirementDto.obsolescenceReason.trim();
            requirement.obsoleteAt = new Date();

            return this.toResponseDto(await manager.save(Requirement, requirement));
        });
    }

    async delete(id: string): Promise<void> {
        this.validateRequirementId(id);

        await this.dataSource.transaction(async (manager) => {
            const requirement = await this.findRequirementForUpdate(manager, id);

            if (requirement.status !== RequirementStatus.Draft) {
                throw new ConflictException('Only draft requirements can be deleted');
            }

            await this.createRevisionSnapshot(manager, requirement);

            requirement.status = RequirementStatus.Deleted;
            requirement.deletedAt = new Date();

            await manager.save(Requirement, requirement);
        });
    }

    private async transitionRequirement(
        id: string,
        requiredStatus: RequirementStatus,
        nextStatus: RequirementStatus,
        invalidTransitionMessage: string,
        applyTransition: (requirement: Requirement) => void,
    ): Promise<RequirementResponseDto> {
        this.validateRequirementId(id);

        return this.dataSource.transaction(async (manager) => {
            const requirement = await this.findRequirementForUpdate(manager, id);

            if (requirement.status !== requiredStatus) {
                throw new ConflictException(invalidTransitionMessage);
            }

            await this.createRevisionSnapshot(manager, requirement);

            requirement.status = nextStatus;
            applyTransition(requirement);

            return this.toResponseDto(await manager.save(Requirement, requirement));
        });
    }

    private async findRequirementForUpdate(manager: EntityManager, id: string): Promise<Requirement> {
        this.validateRequirementId(id);

        const requirement = await manager.findOne(Requirement, { where: { id }, lock: { mode: 'pessimistic_write' } });

        if (requirement === null || requirement.status === RequirementStatus.Deleted) {
            throw new NotFoundException(`Requirement "${id}" was not found`);
        }

        return requirement;
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

    private async createRevisionSnapshot(manager: EntityManager, requirement: Requirement): Promise<void> {
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
            rejectionReason: requirement.rejectionReason,
            reviewer: requirement.reviewer,
            rejectedAt: requirement.rejectedAt,
            deletedAt: requirement.deletedAt,
            approvedAt: requirement.approvedAt,
            implementedAt: requirement.implementedAt,
            obsolescenceReason: requirement.obsolescenceReason,
            obsoleteAt: requirement.obsoleteAt,
            requirementCreatedAt: requirement.createdAt,
            requirementUpdatedAt: requirement.updatedAt,
        });

        await manager.save(RequirementRevision, revision);
    }

    private async ensureRequirementExists(id: string): Promise<void> {
        await this.findActiveOrRejectedRequirementById(id);
    }

    private async findActiveOrRejectedRequirementById(id: string): Promise<Requirement> {
        const requirement = await this.requirementsRepository.findOne({
            where: { id, status: Not(RequirementStatus.Deleted) },
        });

        if (requirement === null) {
            throw new NotFoundException(`Requirement "${id}" was not found`);
        }

        return requirement;
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
        this.validatePriority(createRequirementDto.priority);
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
            this.validatePriority(updateRequirementDto.priority);
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

    private validatePriority(value: unknown): void {
        this.validateRequiredString(value, 'Requirement priority is required');

        if (!['p1', 'p2', 'p3'].includes((value as string).trim())) {
            throw new BadRequestException('Requirement priority must be p1, p2, or p3');
        }
    }

    private validateMarkObsoleteRequirementDto(markObsoleteRequirementDto: MarkObsoleteRequirementDto): void {
        if (typeof markObsoleteRequirementDto !== 'object' || markObsoleteRequirementDto === null) {
            throw new BadRequestException('Requirement obsolete request body is required');
        }

        this.validateRequiredString(
            markObsoleteRequirementDto.obsolescenceReason,
            'Requirement obsolescence reason is required',
        );
    }

    private validateRejectRequirementDto(rejectRequirementDto: RejectRequirementDto): void {
        if (typeof rejectRequirementDto !== 'object' || rejectRequirementDto === null) {
            throw new BadRequestException('Requirement rejection request body is required');
        }

        this.validateRequiredString(rejectRequirementDto.rejectionReason, 'Requirement rejection reason is required');
        this.validateRequiredString(rejectRequirementDto.reviewer, 'Requirement reviewer is required', 120);
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
            rejectionReason: requirement.rejectionReason,
            reviewer: requirement.reviewer,
            rejectedAt: requirement.rejectedAt?.toISOString() ?? null,
            deletedAt: requirement.deletedAt?.toISOString() ?? null,
            approvedAt: requirement.approvedAt?.toISOString() ?? null,
            implementedAt: requirement.implementedAt?.toISOString() ?? null,
            obsolescenceReason: requirement.obsolescenceReason,
            obsoleteAt: requirement.obsoleteAt?.toISOString() ?? null,
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
            rejectionReason: revision.rejectionReason,
            reviewer: revision.reviewer,
            rejectedAt: revision.rejectedAt?.toISOString() ?? null,
            deletedAt: revision.deletedAt?.toISOString() ?? null,
            approvedAt: revision.approvedAt?.toISOString() ?? null,
            implementedAt: revision.implementedAt?.toISOString() ?? null,
            obsolescenceReason: revision.obsolescenceReason,
            obsoleteAt: revision.obsoleteAt?.toISOString() ?? null,
            requirementCreatedAt: revision.requirementCreatedAt.toISOString(),
            requirementUpdatedAt: revision.requirementUpdatedAt.toISOString(),
            createdAt: revision.createdAt.toISOString(),
        };
    }
}
