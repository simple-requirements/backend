import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';

import { Category } from '@/projects/categories.entity';
import { Metric } from '@/projects/metrics.entity';
import { Project } from '@/projects/projects.entity';
import { RequirementLink } from '@/projects/requirement-links.entity';
import { RequirementRevision } from '@/projects/requirement-revisions.entity';
import { Requirement } from '@/projects/requirements.entity';
import {
    createRequirementMetricSnapshot,
    parseMetricReferenceKeys,
    renderRequirementMetricSnapshot,
} from '@/projects/requirements/requirement-metric-snapshot';
import type {
    CanonicalExportBundle,
    ExportCategory,
    ExportMetric,
    ExportProjectBundle,
    ExportRequirement,
    ExportRequirementLink,
    ExportRequirementMetricLink,
    ExportRequirementRevision,
    ExportScope,
    ExportWarning,
} from '@/export/export.types';

interface ProjectSelection {
    project: Project;
    requirements: Requirement[];
    allRequirements: Requirement[];
    selectionOnly: boolean;
}

@Injectable()
export class ExportBundleBuilderService {
    constructor(
        @InjectRepository(Project) private readonly projects: Repository<Project>,
        @InjectRepository(Category) private readonly categories: Repository<Category>,
        @InjectRepository(Requirement) private readonly requirements: Repository<Requirement>,
        @InjectRepository(RequirementRevision) private readonly revisions: Repository<RequirementRevision>,
        @InjectRepository(Metric) private readonly metrics: Repository<Metric>,
        @InjectRepository(RequirementLink) private readonly requirementLinks: Repository<RequirementLink>,
    ) {}

    async allProjects(formatId: string): Promise<CanonicalExportBundle> {
        const projects = await this.projects.find({ order: { name: 'ASC', id: 'ASC' } });
        const selections = await Promise.all(projects.map((project) => this.fullProjectSelection(project)));
        return this.build('all_projects', formatId, selections);
    }

    async project(projectId: string, formatId: string): Promise<CanonicalExportBundle> {
        const project = await this.projects.findOneBy({ id: projectId });
        if (project === null) throw new NotFoundException(`Project with id "${projectId}" was not found.`);
        return this.build('project', formatId, [await this.fullProjectSelection(project)]);
    }

    async requirementSelection(requirementIds: string[], formatId: string): Promise<CanonicalExportBundle> {
        const uniqueIds = [...new Set(requirementIds)];
        if (uniqueIds.length === 0) throw new BadRequestException('At least one requirement id is required.');

        const selected = await this.requirements.find({ where: { id: In(uniqueIds) } });
        const foundIds = new Set(selected.map(({ id }) => id));
        const missingId = uniqueIds.find((id) => !foundIds.has(id));
        if (missingId !== undefined) throw new NotFoundException(`Requirement with id "${missingId}" was not found.`);

        const selectedByProject = this.groupRequirementsByProject(selected);
        const selections: ProjectSelection[] = [];
        for (const [projectId, requirements] of selectedByProject) {
            const project = await this.projects.findOneBy({ id: projectId });
            if (project === null) throw new NotFoundException(`Project with id "${projectId}" was not found.`);
            selections.push({
                project,
                requirements: [...requirements].sort((left, right) => left.visibleKey.localeCompare(right.visibleKey)),
                allRequirements: await this.requirements.find({ where: { projectId }, order: { visibleKey: 'ASC' } }),
                selectionOnly: true,
            });
        }
        selections.sort((left, right) => left.project.name.localeCompare(right.project.name));
        return this.build('requirements', formatId, selections);
    }

    private async fullProjectSelection(project: Project): Promise<ProjectSelection> {
        const requirements = await this.requirements.find({
            where: { projectId: project.id },
            order: { visibleKey: 'ASC' },
        });
        return { project, requirements, allRequirements: requirements, selectionOnly: false };
    }

    private async build(
        scope: ExportScope,
        formatId: string,
        selections: ProjectSelection[],
    ): Promise<CanonicalExportBundle> {
        const warnings: ExportWarning[] = [];
        const projects: ExportProjectBundle[] = [];
        for (const selection of selections) projects.push(await this.buildProject(selection, warnings));

        return {
            schemaVersion: '1.0',
            application: 'Requirements Management',
            exportedAt: new Date().toISOString(),
            formatId,
            scope,
            warnings,
            projects,
        };
    }

    private async buildProject(selection: ProjectSelection, warnings: ExportWarning[]): Promise<ExportProjectBundle> {
        const requirementIds = selection.requirements.map(({ id }) => id);
        const revisions =
            requirementIds.length === 0 ?
                []
            :   await this.revisions.find({
                    where: { requirementId: In(requirementIds) },
                    order: { requirementId: 'ASC', revisionNumber: 'ASC' },
                });
        const projectMetrics = await this.metrics.find({
            where: { projectId: selection.project.id },
            order: { key: 'ASC' },
        });
        const allCategories = await this.categories.find({
            where: { projectId: selection.project.id },
            order: { type: 'ASC', key: 'ASC' },
        });
        const allLinks = await this.requirementLinks.find({
            where: { projectId: selection.project.id },
            order: { createdAt: 'ASC', id: 'ASC' },
        });
        const requirementKeyById = new Map(
            selection.allRequirements.map((requirement) => [requirement.id, requirement.visibleKey]),
        );
        const selectedIds = new Set(requirementIds);

        const categories =
            selection.selectionOnly ?
                this.filterCategories(allCategories, selection.requirements, revisions)
            :   allCategories;
        const metrics =
            selection.selectionOnly ?
                this.filterMetrics(projectMetrics, selection.requirements, revisions)
            :   projectMetrics;
        const links =
            selection.selectionOnly ?
                allLinks.filter(
                    (link) => selectedIds.has(link.sourceRequirementId) || selectedIds.has(link.targetRequirementId),
                )
            :   allLinks;

        const revisionsByRequirement = this.groupRevisionsByRequirement(revisions);
        const requirements = selection.requirements.map((requirement) =>
            this.mapRequirement(
                requirement,
                revisionsByRequirement.get(requirement.id) ?? [],
                projectMetrics,
                warnings,
            ),
        );

        return {
            project: {
                id: selection.project.id,
                name: selection.project.name,
                ticketUrlTemplate: selection.project.ticketUrlTemplate,
                createdAt: selection.project.createdAt.toISOString(),
                updatedAt: selection.project.updatedAt.toISOString(),
            },
            categories: categories.map((category) => this.mapCategory(category)),
            metrics: metrics.map((metric) => this.mapMetric(metric)),
            requirements,
            requirementMetricLinks: this.mapMetricLinks(selection.requirements),
            requirementLinks: links.flatMap((link) => this.mapRequirementLink(link, requirementKeyById)),
            requirementLinkHistory: [],
        };
    }

    private groupRequirementsByProject(requirements: Requirement[]): Map<string, Requirement[]> {
        const grouped = new Map<string, Requirement[]>();
        for (const requirement of requirements) {
            const group = grouped.get(requirement.projectId) ?? [];
            group.push(requirement);
            grouped.set(requirement.projectId, group);
        }
        return grouped;
    }

    private groupRevisionsByRequirement(revisions: RequirementRevision[]): Map<string, RequirementRevision[]> {
        const grouped = new Map<string, RequirementRevision[]>();
        for (const revision of revisions) {
            const group = grouped.get(revision.requirementId) ?? [];
            group.push(revision);
            grouped.set(revision.requirementId, group);
        }
        return grouped;
    }

    private filterCategories(
        categories: Category[],
        requirements: Requirement[],
        revisions: RequirementRevision[],
    ): Category[] {
        const usedIds = new Set([
            ...requirements.map(({ categoryId }) => categoryId),
            ...revisions.map(({ categoryId }) => categoryId),
        ]);
        return categories.filter(({ id }) => usedIds.has(id));
    }

    private filterMetrics(metrics: Metric[], requirements: Requirement[], revisions: RequirementRevision[]): Metric[] {
        const usedIds = new Set([
            ...requirements.flatMap((requirement) => requirement.metrics.map(({ id }) => id)),
            ...revisions.flatMap((revision) => revision.metricSnapshots.map(({ metricId }) => metricId)),
        ]);
        return metrics.filter(({ id }) => usedIds.has(id));
    }

    private mapRequirement(
        requirement: Requirement,
        revisions: RequirementRevision[],
        projectMetrics: Metric[],
        warnings: ExportWarning[],
    ): ExportRequirement {
        const snapshot = createRequirementMetricSnapshot(requirement.description, projectMetrics);
        this.addMetricWarnings(
            requirement.projectId,
            requirement.id,
            requirement.visibleKey,
            requirement.description,
            snapshot.map(({ key }) => key),
            warnings,
        );
        return {
            id: requirement.id,
            categoryId: requirement.categoryId,
            sequenceNumber: requirement.sequenceNumber,
            visibleKey: requirement.visibleKey,
            revisionNumber: requirement.revisionNumber,
            status: requirement.status,
            description: requirement.description,
            renderedDescription: renderRequirementMetricSnapshot(requirement.description, snapshot),
            priority: requirement.priority,
            owner: requirement.owner,
            rationale: requirement.rationale,
            source: requirement.source,
            reviewer: requirement.reviewer,
            rejectionReason: requirement.rejectionReason,
            obsoletedBy: requirement.obsoletedBy,
            obsolescenceReason: requirement.obsolescenceReason,
            implementationTickets: requirement.implementationTickets.map((ticket) => ({
                id: ticket.id,
                ticketId: ticket.ticketId,
                completedBy: ticket.completedBy,
                completedAt: ticket.completedAt,
            })),
            changeType: requirement.changeType,
            changeReason: requirement.changeReason,
            changedAt: requirement.changedAt.toISOString(),
            changedByUserId: requirement.changedByUserId,
            changedByDisplayName: requirement.changedByDisplayName,
            createdAt: requirement.createdAt.toISOString(),
            updatedAt: requirement.updatedAt.toISOString(),
            revisions: [
                ...revisions.map((revision) => this.mapRevision(revision, warnings)),
                this.mapCurrentRevision(requirement, snapshot),
            ],
        };
    }

    private mapCurrentRevision(
        requirement: Requirement,
        metricSnapshots: ReturnType<typeof createRequirementMetricSnapshot>,
    ): ExportRequirementRevision {
        return {
            revisionNumber: requirement.revisionNumber,
            categoryId: requirement.categoryId,
            visibleKey: requirement.visibleKey,
            status: requirement.status,
            description: requirement.description,
            renderedDescription: renderRequirementMetricSnapshot(requirement.description, metricSnapshots),
            metricSnapshots: metricSnapshots.map((snapshot) => ({ ...snapshot })),
            priority: requirement.priority,
            owner: requirement.owner,
            rationale: requirement.rationale,
            source: requirement.source,
            reviewer: requirement.reviewer,
            rejectionReason: requirement.rejectionReason,
            obsoletedBy: requirement.obsoletedBy,
            obsolescenceReason: requirement.obsolescenceReason,
            implementationTickets: requirement.implementationTickets.map((ticket) => ({
                id: ticket.id,
                ticketId: ticket.ticketId,
                completedBy: ticket.completedBy,
                completedAt: ticket.completedAt,
            })),
            changeType: requirement.changeType,
            changeReason: requirement.changeReason,
            changedAt: requirement.changedAt.toISOString(),
            changedByUserId: requirement.changedByUserId,
            changedByDisplayName: requirement.changedByDisplayName,
            createdAt: requirement.createdAt.toISOString(),
            updatedAt: requirement.updatedAt.toISOString(),
        };
    }

    private mapRevision(revision: RequirementRevision, warnings: ExportWarning[]): ExportRequirementRevision {
        this.addMetricWarnings(
            revision.projectId,
            revision.requirementId,
            revision.visibleKey,
            revision.description,
            revision.metricSnapshots.map(({ key }) => key),
            warnings,
            revision.revisionNumber,
        );
        return {
            revisionNumber: revision.revisionNumber,
            categoryId: revision.categoryId,
            visibleKey: revision.visibleKey,
            status: revision.status,
            description: revision.description,
            renderedDescription: renderRequirementMetricSnapshot(revision.description, revision.metricSnapshots),
            metricSnapshots: revision.metricSnapshots.map((snapshot) => ({ ...snapshot })),
            priority: revision.priority,
            owner: revision.owner,
            rationale: revision.rationale,
            source: revision.source,
            reviewer: revision.reviewer,
            rejectionReason: revision.rejectionReason,
            obsoletedBy: revision.obsoletedBy,
            obsolescenceReason: revision.obsolescenceReason,
            implementationTickets: revision.implementationTickets.map((ticket) => ({ ...ticket })),
            changeType: revision.changeType,
            changeReason: revision.changeReason,
            changedAt: revision.changedAt.toISOString(),
            changedByUserId: revision.changedByUserId,
            changedByDisplayName: revision.changedByDisplayName,
            createdAt: revision.createdAt.toISOString(),
            updatedAt: revision.updatedAt.toISOString(),
        };
    }

    private addMetricWarnings(
        projectId: string,
        requirementId: string,
        requirementKey: string,
        description: string | null,
        resolvedKeys: string[],
        warnings: ExportWarning[],
        revisionNumber?: number,
    ): void {
        const resolved = new Set(resolvedKeys);
        const revisionLabel = revisionNumber === undefined ? '' : ` revision ${String(revisionNumber)}`;
        for (const key of parseMetricReferenceKeys(description)) {
            if (resolved.has(key)) continue;
            warnings.push({
                code: 'unresolved_metric_reference',
                message: `Requirement ${requirementKey}${revisionLabel} contains unresolved metric reference ${key}.`,
                projectId,
                requirementId,
                requirementKey,
                metricKey: key,
                ...(revisionNumber === undefined ? {} : { revisionNumber }),
            });
        }
    }

    private mapMetricLinks(requirements: Requirement[]): ExportRequirementMetricLink[] {
        return requirements
            .flatMap((requirement) =>
                requirement.metrics.map((metric) => ({
                    requirementId: requirement.id,
                    requirementKey: requirement.visibleKey,
                    metricId: metric.id,
                    metricKey: metric.key,
                })),
            )
            .sort(
                (left, right) =>
                    left.requirementKey.localeCompare(right.requirementKey)
                    || left.metricKey.localeCompare(right.metricKey),
            );
    }

    private mapRequirementLink(
        link: RequirementLink,
        requirementKeyById: Map<string, string>,
    ): ExportRequirementLink[] {
        const sourceRequirementKey = requirementKeyById.get(link.sourceRequirementId);
        const targetRequirementKey = requirementKeyById.get(link.targetRequirementId);
        if (sourceRequirementKey === undefined || targetRequirementKey === undefined) return [];
        return [
            {
                id: link.id,
                relationshipType: link.relationshipType,
                sourceRequirementId: link.sourceRequirementId,
                sourceRequirementKey,
                targetRequirementId: link.targetRequirementId,
                targetRequirementKey,
                createdAt: link.createdAt.toISOString(),
                updatedAt: link.updatedAt.toISOString(),
            },
        ];
    }

    private mapCategory(category: Category): ExportCategory {
        return {
            id: category.id,
            key: category.key,
            name: category.name,
            type: category.type,
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString(),
        };
    }

    private mapMetric(metric: Metric): ExportMetric {
        return {
            id: metric.id,
            key: metric.key,
            value: metric.value,
            description: metric.description,
            active: metric.active,
            createdAt: metric.createdAt.toISOString(),
            updatedAt: metric.updatedAt.toISOString(),
        };
    }
}
