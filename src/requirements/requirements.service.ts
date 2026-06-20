import { UUID_PATTERN } from '@/common/uuid';
import { Metric } from '@/metrics/metric.entity';
import { RequirementMetricLink } from '@/metrics/requirement-metric-link.entity';
import { parseInlineMetrics } from '@/metrics/inline/metric-inline-parser';
import { Project } from '@/projects/project.entity';
import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { MarkObsoleteRequirementDto } from '@/requirements/dto/mark-obsolete-requirement.dto';
import type { RejectRequirementDto } from '@/requirements/dto/reject-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import type { RequirementRevisionResponseDto } from '@/requirements/dto/requirement-revision-response.dto';
import type { UpdateRequirementDto } from '@/requirements/dto/update-requirement.dto';
import type { RequirementListFilters, RequirementListQueryDto } from '@/requirements/requirements-query.dto';
import { VISIBLE_KEY_PATTERN } from '@/requirements/requirement-key-patterns';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, Not, Repository } from 'typeorm';

const IMMUTABLE_UPDATE_FIELDS = [
    'id',
    'visibleKey',
    'type',
    'projectId',
    'categoryId',
    'sequenceNumber',
    'status',
] as const;
const EDITABLE_UPDATE_FIELDS = ['description', 'priority', 'owner', 'rationale', 'source'] as const;
const LIFECYCLE_TRANSITIONS: Readonly<Record<RequirementStatus, readonly RequirementStatus[]>> = {
    [RequirementStatus.Draft]: [RequirementStatus.Approved, RequirementStatus.Rejected],
    [RequirementStatus.Approved]: [RequirementStatus.Implemented, RequirementStatus.Obsolete],
    [RequirementStatus.Rejected]: [RequirementStatus.Obsolete],
    [RequirementStatus.Implemented]: [],
    [RequirementStatus.Obsolete]: [],
    [RequirementStatus.Deleted]: [],
};

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
        @InjectRepository(Project)
        private readonly projectsRepository: Repository<Project>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly requirementsKeyAllocatorService: RequirementsKeyAllocatorService,
    ) {}

    /**
     * Creates a draft requirement after validating request content and allocating a visible key.
     *
     * Validation runs before key allocation so malformed input cannot consume sequence numbers. Key reservation and draft-content persistence share one transaction so a created requirement is never partially initialized.
     *
     * @param createRequirementDto - Client-provided classification and draft content.
     * @returns The created requirement response with allocated internal ID and visible key.
     * @throws BadRequestException If the input body or fields are malformed.
     * @throws NotFoundException If the category does not exist.
     * @throws ConflictException If visible-key allocation collides or the sequence range is exhausted.
     */
    async create(createRequirementDto: CreateRequirementDto): Promise<RequirementResponseDto> {
        this.validateCreateRequirementDto(createRequirementDto);

        return this.requirementsKeyAllocatorService.runWithAllocationConflictMapping(() =>
            this.dataSource.transaction(async (manager) => {
                await this.ensureProjectExists(createRequirementDto.projectId);

                const allocation = await this.requirementsKeyAllocatorService.allocateInTransaction(
                    manager,
                    createRequirementDto.categoryId,
                    createRequirementDto.projectId,
                );

                const requirement = await manager.findOne(Requirement, {
                    where: { id: allocation.id },
                    relations: { category: true, project: true },
                });

                if (requirement === null) {
                    throw new NotFoundException(`Requirement "${allocation.id}" was not found after key allocation`);
                }

                requirement.status = RequirementStatus.Draft;
                const metricContext = await this.resolveMetricReferences(
                    manager,
                    createRequirementDto.projectId,
                    createRequirementDto.description.trim(),
                );
                requirement.description = metricContext.normalizedDescription;
                requirement.priority = createRequirementDto.priority.trim();
                requirement.owner = this.toOptionalTrimmedString(createRequirementDto.owner);
                requirement.rationale = this.toOptionalTrimmedString(createRequirementDto.rationale);
                requirement.source = this.toOptionalTrimmedString(createRequirementDto.source);

                const savedRequirement = await manager.save(Requirement, requirement);
                await this.replaceMetricLinks(manager, savedRequirement.id, metricContext.metrics);
                return this.toResponseDto(savedRequirement, {
                    renderedDescription: this.renderDescription(
                        savedRequirement.description ?? '',
                        new Map(metricContext.metrics.map((metric) => [metric.key, metric])),
                    ),
                    metricReferences: metricContext.metrics.map((metric) => ({
                        id: metric.id,
                        key: metric.key,
                        value: metric.value,
                        description: metric.description,
                        resolved: true,
                    })),
                });
            }),
        );
    }

    /**
     * Retrieves visible requirements ordered by visible key with validated list filters.
     *
     * Deleted requirements remain hidden from list responses so soft deletion cannot expose resources that normal lookups treat as absent. Explicit status filters may select any non-deleted lifecycle state.
     *
     * @param query - Raw HTTP query values received by the controller.
     * @returns Requirement response objects sorted by visible key.
     * @throws BadRequestException If a filter value is invalid or contradictory.
     */
    async findAll(query: RequirementListQueryDto = {}): Promise<RequirementResponseDto[]> {
        const filters = this.toListFilters(query);
        await this.ensureProjectExists(filters.projectId);
        const where: FindOptionsWhere<Requirement> = { status: RequirementStatus.Draft, projectId: filters.projectId };

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
            where.category = { type: filters.type };
        }

        if (filters.categoryId !== undefined) {
            where.categoryId = filters.categoryId;
        }

        if (filters.owner !== undefined) {
            where.owner = filters.owner;
        }

        const requirements = await this.requirementsRepository.find({
            where,
            relations: { category: true, project: true },
            order: { visibleKey: 'ASC' },
        });

        return Promise.all(requirements.map((requirement) => this.toResponseDtoWithResolvedMetrics(requirement)));
    }

    /**
     * Retrieves one non-deleted requirement by internal UUID.
     *
     * @param id - Internal requirement UUID supplied in the route path.
     * @returns Requirement response for non-deleted requirements.
     * @throws BadRequestException If the UUID is malformed.
     * @throws NotFoundException If no non-deleted requirement exists.
     */
    async findOne(id: string): Promise<RequirementResponseDto> {
        const requirement = await this.findActiveOrRejectedRequirementById(id);

        return this.toResponseDtoWithResolvedMetrics(requirement);
    }

    /**
     * Retrieves one non-deleted requirement by consumer-facing visible key.
     *
     * @param visibleKey - Visible key in FR-KEY-0001 or NFR-KEY-0001 format.
     * @returns Requirement response for non-deleted requirements.
     * @throws BadRequestException If the visible key format is invalid.
     * @throws NotFoundException If no non-deleted requirement exists for the key.
     */
    async findByVisibleKey(visibleKey: string): Promise<RequirementResponseDto> {
        if (typeof visibleKey !== 'string' || !VISIBLE_KEY_PATTERN.test(visibleKey)) {
            throw new BadRequestException('Requirement visible key must match FR-KEY-0001 or NFR-KEY-0001');
        }

        const requirement = await this.requirementsRepository.findOne({
            where: { visibleKey, status: Not(RequirementStatus.Deleted) },
            relations: { category: true, project: true },
        });

        if (requirement === null) {
            throw new NotFoundException(`Requirement "${visibleKey}" was not found`);
        }

        return this.toResponseDtoWithResolvedMetrics(requirement);
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
            const requirement = await this.findRequirementForUpdate(manager, id);

            if (requirement.status !== RequirementStatus.Draft) {
                throw new ConflictException('Only draft requirements can be updated');
            }

            await this.createRevisionSnapshot(manager, requirement);
            let metricContext: { normalizedDescription: string; metrics: Metric[] } | undefined;

            if (updateRequirementDto.description !== undefined) {
                metricContext = await this.resolveMetricReferences(
                    manager,
                    requirement.projectId,
                    updateRequirementDto.description.trim(),
                );
                requirement.description = metricContext.normalizedDescription;
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

            const savedRequirement = await manager.save(Requirement, requirement);
            if (metricContext !== undefined) {
                await this.replaceMetricLinks(manager, savedRequirement.id, metricContext.metrics);
                return this.toResponseDto(savedRequirement, {
                    renderedDescription: this.renderDescription(
                        savedRequirement.description ?? '',
                        new Map(metricContext.metrics.map((metric) => [metric.key, metric])),
                    ),
                    metricReferences: metricContext.metrics.map((metric) => ({
                        id: metric.id,
                        key: metric.key,
                        value: metric.value,
                        description: metric.description,
                        resolved: true,
                    })),
                });
            }
            return this.toResponseDto(savedRequirement);
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

            if (!this.canTransition(requirement.status, RequirementStatus.Obsolete)) {
                throw new ConflictException('Only approved or rejected requirements can be marked obsolete');
            }

            await this.createRevisionSnapshot(manager, requirement);

            requirement.status = RequirementStatus.Obsolete;
            requirement.obsolescenceReason = markObsoleteRequirementDto.obsolescenceReason.trim();
            requirement.obsoleteAt = new Date();

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
        nextStatus: RequirementStatus,
        invalidTransitionMessage: string,
        applyTransition: (requirement: Requirement) => void,
    ): Promise<RequirementResponseDto> {
        this.validateRequirementId(id);

        return this.dataSource.transaction(async (manager) => {
            const requirement = await this.findRequirementForUpdate(manager, id);

            if (!this.canTransition(requirement.status, nextStatus)) {
                throw new ConflictException(invalidTransitionMessage);
            }

            await this.createRevisionSnapshot(manager, requirement);

            requirement.status = nextStatus;
            applyTransition(requirement);

            return this.toResponseDto(await manager.save(Requirement, requirement));
        });
    }

    private canTransition(currentStatus: RequirementStatus, nextStatus: RequirementStatus): boolean {
        return LIFECYCLE_TRANSITIONS[currentStatus].includes(nextStatus);
    }

    private async findRequirementForUpdate(manager: EntityManager, id: string): Promise<Requirement> {
        this.validateRequirementId(id);

        const requirement = await manager.findOne(Requirement, {
            where: { id },
            relations: { category: true, project: true },
            lock: { mode: 'pessimistic_write' },
        });

        if (requirement === null || requirement.status === RequirementStatus.Deleted) {
            throw new NotFoundException(`Requirement "${id}" was not found`);
        }

        return requirement;
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
     * @param query - Query object received from the controller.
     * @returns Service-level filters with trimmed string values.
     * @throws BadRequestException If any filter is malformed.
     */
    private toListFilters(query: RequirementListQueryDto): RequirementListFilters {
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
            throw new BadRequestException(
                'Requirement status filter must be draft, approved, implemented, obsolete, rejected, or deleted',
            );
        }

        if (query.owner !== undefined && query.owner.trim() === '') {
            throw new BadRequestException('Requirement owner filter cannot be blank');
        }

        if (query.projectId === undefined) {
            throw new BadRequestException('Requirement project id filter is required');
        }

        if (!UUID_PATTERN.test(query.projectId)) {
            throw new BadRequestException('Requirement project id filter must be a valid UUID');
        }

        return {
            projectId: query.projectId,
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
            type: requirement.category?.type ?? requirement.type,
            projectId: requirement.projectId,
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

    private async ensureProjectExists(projectId: string): Promise<void> {
        const project = await this.projectsRepository.findOne({ where: { id: projectId } });

        if (project === null) {
            throw new NotFoundException(`Project "${projectId}" was not found`);
        }
    }

    private async findActiveOrRejectedRequirementById(id: string): Promise<Requirement> {
        const requirement = await this.requirementsRepository.findOne({
            where: { id, status: Not(RequirementStatus.Deleted) },
            relations: { category: true, project: true },
        });

        if (requirement === null) {
            throw new NotFoundException(`Requirement "${id}" was not found`);
        }

        return requirement;
    }

    private async resolveMetricReferences(
        manager: EntityManager,
        projectId: string,
        description: string,
    ): Promise<{ normalizedDescription: string; metrics: Metric[] }> {
        const parsed = parseInlineMetrics(description);

        if (parsed.parseErrors.length > 0) {
            throw new BadRequestException({
                message: 'Requirement description contains invalid or unsupported metric syntax',
                invalidTokens: parsed.invalidTokens,
            });
        }

        const metrics: Metric[] = [];
        const keys = [...new Set(parsed.references.map((reference) => reference.key))];

        for (const key of keys) {
            const existing = await manager.findOne(Metric, { where: { projectId, key } });

            if (existing === null) {
                throw new NotFoundException({
                    message: `Metric reference "${key}" was not found in this project`,
                    unresolvedMetricReference: { key, projectId },
                });
            }

            metrics.push(existing);
        }

        return { normalizedDescription: parsed.normalizedText, metrics };
    }

    private async buildRenderingContext(
        projectId: string,
        description: string,
    ): Promise<{ renderedDescription: string; metricReferences: RequirementResponseDto['metricReferences'] }> {
        const parsed = parseInlineMetrics(description);
        const references = [...new Set(parsed.references.map((reference) => reference.key))];
        const resolvedMetrics = new Map<string, Metric>();

        for (const key of references) {
            const metric = await this.dataSource.manager.findOne(Metric, { where: { projectId, key } });
            if (metric !== null) {
                resolvedMetrics.set(key, metric);
            }
        }

        return {
            renderedDescription: this.renderDescription(description, resolvedMetrics),
            metricReferences: references.map((key) => {
                const metric = resolvedMetrics.get(key);
                return {
                    id: metric?.id ?? null,
                    key,
                    value: metric?.value ?? null,
                    description: metric?.description ?? null,
                    resolved: metric !== undefined,
                };
            }),
        };
    }

    private async toResponseDtoWithResolvedMetrics(requirement: Requirement): Promise<RequirementResponseDto> {
        const renderingContext = await this.buildRenderingContext(requirement.projectId, requirement.description ?? '');
        return this.toResponseDto(requirement, renderingContext);
    }

    private async replaceMetricLinks(manager: EntityManager, requirementId: string, metrics: Metric[]): Promise<void> {
        if ('delete' in manager && typeof manager.delete === 'function') {
            await manager.delete(RequirementMetricLink, { requirementId });
        }
        for (const metric of metrics) {
            await manager.save(
                RequirementMetricLink,
                manager.create(RequirementMetricLink, { requirementId, metricId: metric.id }),
            );
        }
    }

    private renderDescription(description: string, metrics: Map<string, Metric>): string {
        const valuesByKey = new Map([...metrics.values()].map((metric) => [metric.key, metric.value]));
        return description.replace(
            /\[\s*~\s*(MET-[0-9]{4})\s*\]/g,
            (_token, key: string) => valuesByKey.get(key) ?? `[~${key}]`,
        );
    }

    private validateCreateRequirementDto(createRequirementDto: CreateRequirementDto): void {
        if (typeof createRequirementDto !== 'object' || createRequirementDto === null) {
            throw new BadRequestException('Requirement request body is required');
        }

        if ('type' in (createRequirementDto as unknown as Record<string, unknown>)) {
            throw new BadRequestException('Requirement type is derived from category and cannot be submitted');
        }

        this.validateRequiredString(createRequirementDto.projectId, 'Requirement project id is required');

        if (!UUID_PATTERN.test(createRequirementDto.projectId)) {
            throw new BadRequestException('Requirement project id must be a valid UUID');
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

        if (!suppliedFields.some((field) => (EDITABLE_UPDATE_FIELDS as readonly string[]).includes(field))) {
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

    private toResponseDto(
        requirement: Requirement,
        renderingContext: {
            renderedDescription: string;
            metricReferences: RequirementResponseDto['metricReferences'];
        } = { renderedDescription: requirement.description ?? '', metricReferences: [] },
    ): RequirementResponseDto {
        return {
            id: requirement.id,
            visibleKey: requirement.visibleKey,
            type: requirement.category?.type ?? requirement.type,
            projectId: requirement.projectId,
            categoryId: requirement.categoryId,
            sequenceNumber: requirement.sequenceNumber,
            status: requirement.status,
            description: requirement.description ?? '',
            renderedDescription: renderingContext.renderedDescription,
            metricReferences: renderingContext.metricReferences,
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
            projectId: revision.projectId,
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
