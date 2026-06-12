import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { Requirement } from '@/requirements/requirements.entity';

const VISIBLE_KEY_PATTERN = /^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class RequirementsService {
    constructor(
        @InjectRepository(Requirement)
        private readonly requirementsRepository: Repository<Requirement>,
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
}
