import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type {
    RequirementLinkEndpointDto,
    RequirementLinkResponseDto,
    RequirementLinksOverviewDto,
} from '@/projects/dto/requirement-link.dto';
import { REQUIREMENT_LINK_RELATIONSHIP, RequirementLink } from '@/projects/requirement-links.entity';
import { Requirement } from '@/projects/requirements.entity';

@Injectable()
export class RequirementLinksService {
    constructor(
        @InjectRepository(RequirementLink)
        private readonly linksRepository: Repository<RequirementLink>,
        @InjectRepository(Requirement)
        private readonly requirementsRepository: Repository<Requirement>,
    ) {}

    async overview(projectId: string, requirementId: string): Promise<RequirementLinksOverviewDto> {
        await this.getRequirementOrThrow(projectId, requirementId);
        const links = await this.linksRepository.find({
            where: [{ projectId, sourceRequirementId: requirementId }, { projectId, targetRequirementId: requirementId }],
            relations: {
                sourceRequirement: { category: true },
                targetRequirement: { category: true },
            },
            order: { createdAt: 'ASC' },
        });
        return {
            outgoing: links.filter((link) => link.sourceRequirementId === requirementId).map((link) => this.map(link)),
            incoming: links.filter((link) => link.targetRequirementId === requirementId).map((link) => this.map(link)),
        };
    }

    async create(projectId: string, sourceRequirementId: string, targetKey: string): Promise<RequirementLinkResponseDto> {
        const source = await this.getRequirementOrThrow(projectId, sourceRequirementId);
        const target = await this.getRequirementByKeyOrThrow(projectId, targetKey);
        this.assertNotSelf(source, target);
        await this.assertAvailable(source.id, target.id);
        const saved = await this.linksRepository.save(
            this.linksRepository.create({
                projectId,
                sourceRequirementId: source.id,
                targetRequirementId: target.id,
                relationshipType: REQUIREMENT_LINK_RELATIONSHIP,
            }),
        );
        saved.sourceRequirement = source;
        saved.targetRequirement = target;
        return this.map(saved);
    }

    async update(
        projectId: string,
        sourceRequirementId: string,
        linkId: string,
        targetKey: string,
    ): Promise<RequirementLinkResponseDto> {
        const link = await this.getLinkOrThrow(projectId, sourceRequirementId, linkId);
        const target = await this.getRequirementByKeyOrThrow(projectId, targetKey);
        this.assertNotSelf(link.sourceRequirement, target);
        if (link.targetRequirementId !== target.id) await this.assertAvailable(sourceRequirementId, target.id);
        link.targetRequirementId = target.id;
        link.targetRequirement = target;
        const saved = await this.linksRepository.save(link);
        return this.map(saved);
    }

    async remove(projectId: string, sourceRequirementId: string, linkId: string): Promise<void> {
        const link = await this.getLinkOrThrow(projectId, sourceRequirementId, linkId);
        await this.linksRepository.delete({ id: link.id });
    }

    private async getRequirementOrThrow(projectId: string, requirementId: string): Promise<Requirement> {
        const requirement = await this.requirementsRepository.findOne({
            where: { id: requirementId, projectId },
            relations: { category: true },
        });
        if (requirement === null) {
            throw new NotFoundException(`Requirement with id "${requirementId}" in project "${projectId}" was not found.`);
        }
        return requirement;
    }

    private async getRequirementByKeyOrThrow(projectId: string, visibleKey: string): Promise<Requirement> {
        const requirement = await this.requirementsRepository.findOne({
            where: { projectId, visibleKey },
            relations: { category: true },
        });
        if (requirement === null) {
            throw new NotFoundException(`Requirement with key "${visibleKey}" in project "${projectId}" was not found.`);
        }
        return requirement;
    }

    private async getLinkOrThrow(projectId: string, sourceRequirementId: string, linkId: string): Promise<RequirementLink> {
        const link = await this.linksRepository.findOne({
            where: { id: linkId, projectId, sourceRequirementId },
            relations: {
                sourceRequirement: { category: true },
                targetRequirement: { category: true },
            },
        });
        if (link === null) throw new NotFoundException(`Requirement link with id "${linkId}" was not found.`);
        return link;
    }

    private assertNotSelf(source: Requirement, target: Requirement): void {
        if (source.id === target.id) throw new BadRequestException('A requirement cannot reference itself.');
    }

    private async assertAvailable(sourceRequirementId: string, targetRequirementId: string): Promise<void> {
        if (await this.linksRepository.existsBy({ sourceRequirementId, targetRequirementId })) {
            throw new BadRequestException('This requirement link already exists.');
        }
    }

    private map(link: RequirementLink): RequirementLinkResponseDto {
        return {
            id: link.id,
            projectId: link.projectId,
            relationshipType: REQUIREMENT_LINK_RELATIONSHIP,
            source: this.mapEndpoint(link.sourceRequirement),
            target: this.mapEndpoint(link.targetRequirement),
            createdAt: link.createdAt,
            updatedAt: link.updatedAt,
        };
    }

    private mapEndpoint(requirement: Requirement): RequirementLinkEndpointDto {
        return {
            requirementId: requirement.id,
            visibleKey: requirement.visibleKey,
            type: requirement.category.type,
            categoryId: requirement.categoryId,
            categoryName: requirement.category.name,
            status: requirement.status,
        };
    }
}
