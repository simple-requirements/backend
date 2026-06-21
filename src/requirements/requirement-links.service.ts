import { UUID_PATTERN } from '@/common/uuid';
import { Project } from '@/projects/project.entity';
import { RequirementLink, RequirementLinkRelationshipType } from '@/requirements/requirement-link.entity';
import {
    RequirementLinkHistory,
    RequirementLinkHistoryEventType,
} from '@/requirements/requirement-link-history.entity';
import { RequirementLinkResponseDto, RequirementLinkTargetDto } from '@/requirements/dto/requirement-link.dto';
import {
    RequirementLinkChangesResponseDto,
    RequirementLinkHistoryResponseDto,
    RequirementRevisionLinksResponseDto,
} from '@/requirements/dto/requirement-link-history.dto';
import { VISIBLE_KEY_PATTERN } from '@/requirements/requirement-key-patterns';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { Requirement } from '@/requirements/requirements.entity';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';

@Injectable()
export class RequirementLinksService {
    constructor(
        @InjectRepository(RequirementLink) private readonly links: Repository<RequirementLink>,
        @InjectRepository(Requirement) private readonly requirements: Repository<Requirement>,
        @InjectRepository(Project) private readonly projects: Repository<Project>,
        @InjectRepository(RequirementLinkHistory) private readonly history: Repository<RequirementLinkHistory>,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {}

    async create(sourceRequirementId: string, dto: RequirementLinkTargetDto): Promise<RequirementLinkResponseDto> {
        this.validateRequirementId(sourceRequirementId, 'Source requirement id');
        const source = await this.findRequirement(
            sourceRequirementId,
            `Source requirement "${sourceRequirementId}" was not found`,
        );
        const target = await this.resolveTarget(dto);
        this.validatePair(source, target);
        await this.ensureNoDuplicate(source.id, target.id);
        const linkId = await this.dataSource.transaction(async (manager) => {
            const link = await manager.save(
                RequirementLink,
                manager.create(RequirementLink, {
                    projectId: source.projectId,
                    sourceRequirementId: source.id,
                    targetRequirementId: target.id,
                    relationshipType: RequirementLinkRelationshipType.References,
                    deletedAt: null,
                }),
            );
            await this.recordHistory(manager, link, RequirementLinkHistoryEventType.Created, null, target.id);
            return link.id;
        });
        return this.findLinkResponse(linkId);
    }

    async listOutgoing(requirementId: string): Promise<RequirementLinkResponseDto[]> {
        await this.findRequirementAfterValidating(requirementId);
        return this.toDtos(await this.findActive({ sourceRequirementId: requirementId }));
    }

    async listIncoming(requirementId: string): Promise<RequirementLinkResponseDto[]> {
        await this.findRequirementAfterValidating(requirementId);
        return this.toDtos(await this.findActive({ targetRequirementId: requirementId }));
    }

    async listProject(projectId: string): Promise<RequirementLinkResponseDto[]> {
        this.validateRequirementId(projectId, 'Project id');
        const project = await this.projects.findOne({ where: { id: projectId } });
        if (project === null) throw new NotFoundException(`Project "${projectId}" was not found`);
        return this.toDtos(await this.findActive({ projectId }));
    }

    async update(linkId: string, dto: RequirementLinkTargetDto): Promise<RequirementLinkResponseDto> {
        this.validateRequirementId(linkId, 'Requirement link id');
        const link = await this.links.findOne({
            where: { id: linkId, deletedAt: IsNull() },
            relations: { sourceRequirement: { category: true }, targetRequirement: { category: true } },
        });
        if (link === null) throw new NotFoundException(`Requirement link "${linkId}" was not found`);
        const source = await this.findRequirement(
            link.sourceRequirementId,
            `Source requirement "${link.sourceRequirementId}" was not found`,
        );
        const target = await this.resolveTarget(dto);
        this.validatePair(source, target);
        await this.ensureNoDuplicate(source.id, target.id, link.id);
        const oldTargetRequirementId = link.targetRequirementId;
        await this.dataSource.transaction(async (manager) => {
            link.targetRequirementId = target.id;
            const saved = await manager.save(RequirementLink, link);
            await this.recordHistory(
                manager,
                saved,
                RequirementLinkHistoryEventType.TargetChanged,
                oldTargetRequirementId,
                target.id,
            );
        });
        return this.findLinkResponse(link.id);
    }

    async remove(linkId: string): Promise<void> {
        this.validateRequirementId(linkId, 'Requirement link id');
        const link = await this.links.findOne({ where: { id: linkId, deletedAt: IsNull() } });
        if (link === null) throw new NotFoundException(`Requirement link "${linkId}" was not found`);
        await this.dataSource.transaction(async (manager) => {
            link.deletedAt = new Date();
            const saved = await manager.save(RequirementLink, link);
            await this.recordHistory(
                manager,
                saved,
                RequirementLinkHistoryEventType.Deleted,
                saved.targetRequirementId,
                null,
            );
        });
    }

    async listHistory(requirementId: string): Promise<RequirementLinkHistoryResponseDto[]> {
        await this.findRequirementAfterValidating(requirementId);
        const events = await this.history
            .createQueryBuilder('history')
            .leftJoinAndSelect('history.sourceRequirement', 'source')
            .leftJoinAndSelect('source.category', 'sourceCategory')
            .leftJoinAndSelect('history.oldTargetRequirement', 'oldTarget')
            .leftJoinAndSelect('oldTarget.category', 'oldTargetCategory')
            .leftJoinAndSelect('history.newTargetRequirement', 'newTarget')
            .leftJoinAndSelect('newTarget.category', 'newTargetCategory')
            .where('history.sourceRequirementId = :requirementId', { requirementId })
            .orWhere('history.oldTargetRequirementId = :requirementId', { requirementId })
            .orWhere('history.newTargetRequirementId = :requirementId', { requirementId })
            .orderBy('history.occurredAt', 'ASC')
            .addOrderBy('history.id', 'ASC')
            .getMany();
        return events.map((event) => this.toHistoryDto(event));
    }

    async listRevisionLinks(
        requirementId: string,
        revisionNumber: number,
    ): Promise<RequirementRevisionLinksResponseDto> {
        const revision = await this.findRevisionForLinks(requirementId, revisionNumber);
        const state = await this.reconstructLinksAt(requirementId, revision.createdAt);
        return {
            requirementId,
            revisionNumber,
            revisionCreatedAt: revision.createdAt.toISOString(),
            outgoingLinks: state.outgoing,
            incomingLinks: state.incoming,
        };
    }

    async listChanges(
        requirementId: string,
        fromRevision: number,
        toRevision: number,
    ): Promise<RequirementLinkChangesResponseDto> {
        if (!Number.isInteger(fromRevision) || fromRevision < 1)
            throw new BadRequestException('fromRevision must be a positive integer');
        if (!Number.isInteger(toRevision) || toRevision < 1)
            throw new BadRequestException('toRevision must be a positive integer');
        if (fromRevision === toRevision) throw new BadRequestException('fromRevision and toRevision must be different');
        if (fromRevision > toRevision) throw new BadRequestException('fromRevision must be older than toRevision');
        const from = await this.listRevisionLinks(requirementId, fromRevision);
        const to = await this.listRevisionLinks(requirementId, toRevision);
        const diff = (a: RequirementLinkResponseDto[], b: RequirementLinkResponseDto[]) => {
            const key = (link: RequirementLinkResponseDto) => `${link.id}:${link.targetRequirementId}`;
            const aKeys = new Set(a.map(key));
            const bKeys = new Set(b.map(key));
            return {
                added: b.filter((link) => !aKeys.has(key(link))),
                removed: a.filter((link) => !bKeys.has(key(link))),
                unchanged: b.filter((link) => aKeys.has(key(link))),
            };
        };
        const outgoing = diff(from.outgoingLinks, to.outgoingLinks);
        const incoming = diff(from.incomingLinks, to.incomingLinks);
        return {
            requirementId,
            fromRevision,
            toRevision,
            addedOutgoingLinks: outgoing.added,
            removedOutgoingLinks: outgoing.removed,
            unchangedOutgoingLinks: outgoing.unchanged,
            addedIncomingLinks: incoming.added,
            removedIncomingLinks: incoming.removed,
            unchangedIncomingLinks: incoming.unchanged,
        };
    }

    private async resolveTarget(dto: RequirementLinkTargetDto): Promise<Requirement> {
        const hasId = typeof dto?.targetRequirementId === 'string' && dto.targetRequirementId.trim() !== '';
        const hasKey = typeof dto?.targetVisibleKey === 'string' && dto.targetVisibleKey.trim() !== '';
        if (hasId === hasKey)
            throw new BadRequestException('Provide exactly one of targetRequirementId or targetVisibleKey');
        if (hasId) {
            this.validateRequirementId(dto.targetRequirementId!, 'Target requirement id');
            return this.findRequirement(
                dto.targetRequirementId!,
                `Target requirement "${dto.targetRequirementId}" was not found`,
            );
        }
        const visibleKey = dto.targetVisibleKey!.trim();
        if (!VISIBLE_KEY_PATTERN.test(visibleKey))
            throw new BadRequestException('Target visible key must match FR-KEY-0001 or NFR-KEY-0001');
        const target = await this.requirements.findOne({
            where: { visibleKey, status: Not(RequirementStatus.Deleted) },
            relations: { category: true },
        });
        if (target === null) throw new NotFoundException(`Target requirement "${visibleKey}" was not found`);
        return target;
    }

    private validatePair(source: Requirement, target: Requirement): void {
        if (source.id === target.id)
            throw new BadRequestException('Requirement links cannot reference the source requirement');
        if (source.projectId !== target.projectId)
            throw new BadRequestException('Requirement links cannot cross project boundaries');
    }

    private async ensureNoDuplicate(
        sourceRequirementId: string,
        targetRequirementId: string,
        excludeId?: string,
    ): Promise<void> {
        const existing = await this.links.findOne({
            where: {
                sourceRequirementId,
                targetRequirementId,
                relationshipType: RequirementLinkRelationshipType.References,
                deletedAt: IsNull(),
            },
        });
        if (existing !== null && existing.id !== excludeId)
            throw new ConflictException(
                'An active references link already exists for this source and target requirement',
            );
    }

    private async findRequirementAfterValidating(id: string): Promise<Requirement> {
        this.validateRequirementId(id, 'Requirement id');
        return this.findRequirement(id, `Requirement "${id}" was not found`);
    }

    private async findRequirement(id: string, message: string): Promise<Requirement> {
        const requirement = await this.requirements.findOne({
            where: { id, status: Not(RequirementStatus.Deleted) },
            relations: { category: true },
        });
        if (requirement === null) throw new NotFoundException(message);
        return requirement;
    }

    private findActive(where: Partial<RequirementLink>): Promise<RequirementLink[]> {
        return this.links.find({
            where: { ...where, deletedAt: IsNull() },
            relations: { sourceRequirement: { category: true }, targetRequirement: { category: true } },
            order: { createdAt: 'ASC', id: 'ASC' },
        });
    }

    private async findLinkResponse(id: string): Promise<RequirementLinkResponseDto> {
        const link = await this.links.findOne({
            where: { id, deletedAt: IsNull() },
            relations: { sourceRequirement: { category: true }, targetRequirement: { category: true } },
        });
        if (link === null) throw new NotFoundException(`Requirement link "${id}" was not found`);
        return this.toDto(link);
    }

    private toDtos(links: RequirementLink[]): RequirementLinkResponseDto[] {
        return links.map((link) => this.toDto(link));
    }

    private toDto(link: RequirementLink): RequirementLinkResponseDto {
        const source = link.sourceRequirement;
        const target = link.targetRequirement;
        return {
            id: link.id,
            projectId: link.projectId,
            relationshipType: link.relationshipType,
            sourceRequirementId: link.sourceRequirementId,
            sourceVisibleKey: source.visibleKey,
            sourceType: source.type,
            sourceCategoryId: source.categoryId,
            sourceCategoryKey: source.category?.key,
            sourceStatus: source.status,
            targetRequirementId: link.targetRequirementId,
            targetVisibleKey: target.visibleKey,
            targetType: target.type,
            targetCategoryId: target.categoryId,
            targetCategoryKey: target.category?.key,
            targetStatus: target.status,
            createdAt: link.createdAt.toISOString(),
            updatedAt: link.updatedAt.toISOString(),
        };
    }

    private async recordHistory(
        manager: EntityManager,
        link: RequirementLink,
        eventType: RequirementLinkHistoryEventType,
        oldTargetRequirementId: string | null,
        newTargetRequirementId: string | null,
    ): Promise<void> {
        await manager.save(
            RequirementLinkHistory,
            manager.create(RequirementLinkHistory, {
                linkId: link.id,
                projectId: link.projectId,
                sourceRequirementId: link.sourceRequirementId,
                oldTargetRequirementId,
                newTargetRequirementId,
                relationshipType: link.relationshipType,
                eventType,
                occurredAt: new Date(),
                actor: null,
                reason: null,
            }),
        );
    }

    private async findRevisionForLinks(requirementId: string, revisionNumber: number): Promise<{ createdAt: Date }> {
        this.validateRequirementId(requirementId, 'Requirement id');
        if (!Number.isInteger(revisionNumber) || revisionNumber < 1)
            throw new BadRequestException('Requirement revision number must be a positive integer');
        await this.findRequirementAfterValidating(requirementId);
        const revision = await this.dataSource
            .getRepository(RequirementRevision)
            .findOne({ where: { requirementId, revisionNumber } });
        if (revision === null)
            throw new NotFoundException(`Requirement "${requirementId}" revision ${revisionNumber} was not found`);
        return revision;
    }

    private async reconstructLinksAt(
        requirementId: string,
        timestamp: Date,
    ): Promise<{ outgoing: RequirementLinkResponseDto[]; incoming: RequirementLinkResponseDto[] }> {
        const events = await this.history.find({
            where: { occurredAt: LessThanOrEqual(timestamp) },
            relations: {
                sourceRequirement: { category: true },
                oldTargetRequirement: { category: true },
                newTargetRequirement: { category: true },
            },
            order: { occurredAt: 'ASC', id: 'ASC' },
        });
        const byLink = new Map<string, RequirementLinkHistory[]>();
        for (const event of events) {
            const bucket = byLink.get(event.linkId) ?? [];
            bucket.push(event);
            byLink.set(event.linkId, bucket);
        }
        const active: RequirementLinkResponseDto[] = [];
        for (const [linkId, history] of byLink.entries()) {
            const latest = history[history.length - 1];
            if (latest.eventType === RequirementLinkHistoryEventType.Deleted || latest.newTargetRequirementId === null)
                continue;
            const created =
                history.find((event) => event.eventType === RequirementLinkHistoryEventType.Created) ?? latest;
            if (latest.sourceRequirement === undefined || latest.newTargetRequirement === null) {
                throw new ConflictException('Requirement link history is unavailable due to inconsistent data');
            }
            active.push(
                this.toDto({
                    id: linkId,
                    projectId: latest.projectId,
                    sourceRequirementId: latest.sourceRequirementId,
                    targetRequirementId: latest.newTargetRequirementId,
                    relationshipType: latest.relationshipType,
                    createdAt: created.occurredAt,
                    updatedAt: latest.occurredAt,
                    deletedAt: null,
                    sourceRequirement: latest.sourceRequirement,
                    targetRequirement: latest.newTargetRequirement,
                } as RequirementLink),
            );
        }
        active.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
        return {
            outgoing: active.filter((link) => link.sourceRequirementId === requirementId),
            incoming: active.filter((link) => link.targetRequirementId === requirementId),
        };
    }

    private toHistoryDto(event: RequirementLinkHistory): RequirementLinkHistoryResponseDto {
        return {
            id: event.id,
            linkId: event.linkId,
            projectId: event.projectId,
            eventType: event.eventType,
            relationshipType: event.relationshipType,
            sourceRequirementId: event.sourceRequirementId,
            sourceVisibleKey: event.sourceRequirement.visibleKey,
            oldTargetRequirementId: event.oldTargetRequirementId,
            oldTargetVisibleKey: event.oldTargetRequirement?.visibleKey ?? null,
            newTargetRequirementId: event.newTargetRequirementId,
            newTargetVisibleKey: event.newTargetRequirement?.visibleKey ?? null,
            occurredAt: event.occurredAt.toISOString(),
            actor: event.actor,
            reason: event.reason,
        };
    }

    private validateRequirementId(id: string, label: string): void {
        if (typeof id !== 'string' || !UUID_PATTERN.test(id))
            throw new BadRequestException(`${label} must be a valid UUID`);
    }
}
