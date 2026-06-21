import { UUID_PATTERN } from '@/common/uuid';
import { Project } from '@/projects/project.entity';
import { RequirementLink, RequirementLinkRelationshipType } from '@/requirements/requirement-link.entity';
import { RequirementLinkResponseDto, RequirementLinkTargetDto } from '@/requirements/dto/requirement-link.dto';
import { VISIBLE_KEY_PATTERN } from '@/requirements/requirement-key-patterns';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { Requirement } from '@/requirements/requirements.entity';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

@Injectable()
export class RequirementLinksService {
    constructor(
        @InjectRepository(RequirementLink) private readonly links: Repository<RequirementLink>,
        @InjectRepository(Requirement) private readonly requirements: Repository<Requirement>,
        @InjectRepository(Project) private readonly projects: Repository<Project>,
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
        const link = await this.links.save(
            this.links.create({
                projectId: source.projectId,
                sourceRequirementId: source.id,
                targetRequirementId: target.id,
                relationshipType: RequirementLinkRelationshipType.References,
                deletedAt: null,
            }),
        );
        return this.findLinkResponse(link.id);
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
        link.targetRequirementId = target.id;
        await this.links.save(link);
        return this.findLinkResponse(link.id);
    }

    async remove(linkId: string): Promise<void> {
        this.validateRequirementId(linkId, 'Requirement link id');
        const link = await this.links.findOne({ where: { id: linkId, deletedAt: IsNull() } });
        if (link === null) throw new NotFoundException(`Requirement link "${linkId}" was not found`);
        link.deletedAt = new Date();
        await this.links.save(link);
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

    private validateRequirementId(id: string, label: string): void {
        if (typeof id !== 'string' || !UUID_PATTERN.test(id))
            throw new BadRequestException(`${label} must be a valid UUID`);
    }
}
