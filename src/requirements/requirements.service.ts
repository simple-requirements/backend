import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { RejectRequirementDto } from '@/requirements/dto/reject-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import type { RequirementRevisionResponseDto } from '@/requirements/dto/requirement-revision-response.dto';
import type { UpdateRequirementDto } from '@/requirements/dto/update-requirement.dto';
import type { RequirementListFilters, RequirementListQueryDto } from '@/requirements/requirements-query.dto';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, Not, Repository } from 'typeorm';

const VISIBLE_KEY_PATTERN = /^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMMUTABLE_UPDATE_FIELDS = ['id', 'visibleKey', 'type', 'categoryId', 'sequenceNumber', 'status'] as const;

/**
 * Coordinates requirement persistence, lifecycle transitions, filtering, and revision snapshots.
 *
 * The service owns application-layer validation and transactional mutation rules, while visible-key allocation is delegated to RequirementsKeyAllocatorService so counters remain durable and concurrency-safe.
 */
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

    /**
     * Creates a draft requirement after validating request content and allocating a visible key.
     *
     * Validation runs before key allocation so malformed input cannot consume sequence numbers. The allocator persists the empty requirement identity in a transaction, after which this method stores editable draft fields.
     *
     * @param createRequirementDto - Client-provided classification and draft content.
     * @returns The created requirement response with allocated internal ID and visible key.
     * @throws BadRequestException If the input body or fields are malformed.
     * @throws NotFoundException If the category does not exist.
     * @throws ConflictException If visible-key allocation collides or the sequence range is exhausted.
     */
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

    /**
     * Retrieves visible requirements ordered by visible key with validated list filters.
     *
     * Deleted requirements remain hidden from list responses so soft deletion cannot expose resources that normal lookups treat as absent. Explicit status filters override includeRejected for draft and rejected states.
     *
     * @param query - Raw HTTP query values received by the controller.
     * @returns Requirement response objects sorted by visible key.
     * @throws BadRequestException If a filter value is invalid or contradictory.
     */
    async findAll(query: RequirementListQueryDto | boolean = {}): Promise<RequirementResponseDto[]> {
        const filters = this.toListFilters(query);
        const where: FindOptionsWhere<Requirement> = { status: RequirementStatus.Draft };

        if (filters.includeRejected) {
            where.status = Not(RequirementStatus.Deleted);
        }

        if (filters.status !== undefined) {
            if (filters.status === RequirementStatus.Deleted) {
                return [];
            }

            where.status = filters.status;
        }

        if (filters.type !== undefined) {
            where.type = filters.type;
        }

        if (filters.categoryId !== undefined) {
            where.categoryId = filters.categoryId;
        }

        if (filters.owner !== undefined) {
            where.owner = filters.owner;
        }

        const requirements = await this.requirementsRepository.find({ where, order: { visibleKey: 'ASC' } });

        return requirements.map((requirement) => this.toResponseDto(requirement));
    }

    /**
     * Retrieves one non-deleted requirement by internal UUID.
     *
     * @param id - Internal requirement UUID supplied in the route path.
     * @returns Requirement response for draft or rejected requirements.
     * @throws BadRequestException If the UUID is malformed.
     * @throws NotFoundException If no non-deleted requirement exists.
     */
    async findOne(id: string): Promise<RequirementResponseDto> {
        const requirement = await this.findActiveOrRejectedRequirementById(id);

        return this.toResponseDto(requirement);
    }

    /**
     * Retrieves one non-deleted requirement by consumer-facing visible key.
     *
     * @param visibleKey - Visible key in FR-KEY-0001 or NFR-KEY-0001 format.
     * @returns Requirement response for draft or rejected requirements.
     * @throws BadRequestException If the visible key format is invalid.
     * @throws NotFoundException If no non-deleted requirement exists for the key.
     */
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

    /**
     * Updates editable fields for a draft requirement inside a row-locking transaction.
     *
     * The current persisted state is snapshotted before mutation so revision history preserves the previous version. Identity, classification, status, and sequence fields are immutable through this path.
     *
     * @param id - Internal requirement UUID.
     * @param updateRequirementDto - Editable fields to update.
     * @returns Updated requirement response.
     * @throws BadRequestException If the UUID or body is malformed.
     * @throws NotFoundException If the requirement is missing or deleted.
     * @throws ConflictException If the requirement is not in draft status.
     */
    async update(id: string, updateRequirementDto: UpdateRequirementDto): Promise<RequirementResponseDto> {
        this.validateRequirementId(id);
        this.validateUpdateRequirementDto(updateRequirementDto);

        return this.dataSource.transaction(async (manager) => {
            const requirement = await manager.findOne(Requirement, {
                where: { id },
                lock: { mode: 'pessimistic_write' },
            });

            if (requirement === null || requirement.status === RequirementStatus.Deleted) {
                throw new NotFoundException(`Requirement "${id}" was not found`);
            }

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

    /**
     * Rejects a draft requirement inside a row-locking transaction.
     *
     * The method records reviewer metadata and creates a revision snapshot before changing lifecycle state, ensuring visible keys remain reserved and rejected requirements are still explicitly retrievable.
     *
     * @param id - Internal requirement UUID.
     * @param rejectRequirementDto - Rejection reason and reviewer.
     * @returns Rejected requirement response.
     * @throws BadRequestException If route or body input is malformed.
     * @throws NotFoundException If the requirement is missing or deleted.
     * @throws ConflictException If the requirement is not in draft status.
     */
    async reject(id: string, rejectRequirementDto: RejectRequirementDto): Promise<RequirementResponseDto> {
        this.validateRequirementId(id);
        this.validateRejectRequirementDto(rejectRequirementDto);

        return this.dataSource.transaction(async (manager) => {
            const requirement = await manager.findOne(Requirement, {
                where: { id },
                lock: { mode: 'pessimistic_write' },
            });

            if (requirement === null || requirement.status === RequirementStatus.Deleted) {
                throw new NotFoundException(`Requirement "${id}" was not found`);
            }

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

    /**
     * Soft-deletes a draft requirement inside a row-locking transaction.
     *
     * Deletion never removes the row or decrements durable counters, so the internal ID and visible key remain reserved while normal reads treat the requirement as absent.
     *
     * @param id - Internal requirement UUID.
     * @throws BadRequestException If the UUID is malformed.
     * @throws NotFoundException If the requirement is missing or already deleted.
     * @throws ConflictException If the requirement is not in draft status.
     */
    async delete(id: string): Promise<void> {
        this.validateRequirementId(id);

        await this.dataSource.transaction(async (manager) => {
            const requirement = await manager.findOne(Requirement, {
                where: { id },
                lock: { mode: 'pessimistic_write' },
            });

            if (requirement === null || requirement.status === RequirementStatus.Deleted) {
                throw new NotFoundException(`Requirement "${id}" was not found`);
            }

            if (requirement.status !== RequirementStatus.Draft) {
                throw new ConflictException('Only draft requirements can be deleted');
            }

            await this.createRevisionSnapshot(manager, requirement);

            requirement.status = RequirementStatus.Deleted;
            requirement.deletedAt = new Date();

            await manager.save(Requirement, requirement);
        });
    }

    /**
     * Lists immutable snapshots captured before requirement lifecycle or edit mutations.
     *
     * @param id - Internal requirement UUID whose revisions should be listed.
     * @returns Revision response objects ordered by ascending revision number.
     * @throws BadRequestException If the UUID is malformed.
     * @throws NotFoundException If the requirement is missing or deleted.
     */
    async findRevisionHistory(id: string): Promise<RequirementRevisionResponseDto[]> {
        this.validateRequirementId(id);
        await this.ensureRequirementExists(id);

        const revisions = await this.requirementRevisionsRepository.find({
            where: { requirementId: id },
            order: { revisionNumber: 'ASC' },
        });

        return revisions.map((revision) => this.toRevisionResponseDto(revision));
    }

    /**
     * Retrieves one immutable requirement revision snapshot by revision number.
     *
     * @param id - Internal requirement UUID.
     * @param revisionNumber - Positive revision number assigned when the snapshot was created.
     * @returns The requested revision snapshot.
     * @throws BadRequestException If the UUID or revision number is invalid.
     * @throws NotFoundException If the requirement or revision is missing.
     */
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

    /**
     * Normalizes and validates raw requirement listing query values.
     *
     * @param query - Query object or legacy boolean includeRejected value used by existing unit tests.
     * @returns Service-level filters with trimmed string values.
     * @throws BadRequestException If any filter is malformed.
     */
    private toListFilters(query: RequirementListQueryDto | boolean): RequirementListFilters {
        if (typeof query === 'boolean') {
            return { includeRejected: query };
        }

        const includeRejected = query.includeRejected === 'true';
        const { type } = query;

        if (query.includeRejected !== undefined && !['true', 'false'].includes(query.includeRejected)) {
            throw new BadRequestException('includeRejected must be true or false');
        }

        if (type !== undefined && !Object.values(RequirementType).includes(type)) {
            throw new BadRequestException('Requirement type filter must be FR or NFR');
        }

        if (query.categoryId !== undefined && !UUID_PATTERN.test(query.categoryId)) {
            throw new BadRequestException('Requirement category id filter must be a valid UUID');
        }

        if (query.status !== undefined && !Object.values(RequirementStatus).includes(query.status)) {
            throw new BadRequestException('Requirement status filter must be draft, rejected, or deleted');
        }

        if (query.owner !== undefined && query.owner.trim() === '') {
            throw new BadRequestException('Requirement owner filter cannot be blank');
        }

        return {
            includeRejected,
            type,
            categoryId: query.categoryId,
            status: query.status,
            owner: query.owner?.trim(),
        };
    }

    /**
     * Persists a revision snapshot of a requirement before mutation.
     *
     * The lookup locks the latest revision row when present so concurrent lifecycle operations cannot assign the same revision number.
     *
     * @param manager - Transactional entity manager performing the surrounding mutation.
     * @param requirement - Current persisted requirement state to snapshot.
     */
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
            requirementCreatedAt: revision.requirementCreatedAt.toISOString(),
            requirementUpdatedAt: revision.requirementUpdatedAt.toISOString(),
            createdAt: revision.createdAt.toISOString(),
        };
    }
}
