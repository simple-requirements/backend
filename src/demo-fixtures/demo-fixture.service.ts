import { createHash } from 'node:crypto';

import { Category } from '@/categories/category.entity';
import { Metric } from '@/metrics/metric.entity';
import { RequirementMetricLink } from '@/metrics/requirement-metric-link.entity';
import { Project } from '@/projects/project.entity';
import { RequirementLink, RequirementLinkRelationshipType } from '@/requirements/requirement-link.entity';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementsKeyCounter } from '@/requirements/requirements-key-counter.entity';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
    DEMO_FIXTURE_CATEGORIES,
    DEMO_FIXTURE_METRICS,
    DEMO_FIXTURE_PROJECTS,
    DEMO_FIXTURE_REQUIREMENT_LINKS,
    DEMO_FIXTURE_REQUIREMENTS,
    DEMO_FIXTURE_RESET_ENV,
    DEMO_FIXTURE_TIMESTAMP,
} from './demo-workspace.fixture';

export interface DemoFixtureResult {
    projects: number;
    categories: number;
    requirements: number;
    requirementLinks: number;
    metrics: number;
    visibleKeys: string[];
}

@Injectable()
export class DemoFixtureService {
    constructor(
        @InjectRepository(Project) private readonly projects: Repository<Project>,
        @InjectRepository(Category) private readonly categories: Repository<Category>,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {}

    validateManifest(): void {
        this.ensureUnique(
            DEMO_FIXTURE_PROJECTS.map((project) => project.id),
            'demo project id',
        );
        this.ensureUnique(
            DEMO_FIXTURE_PROJECTS.map((project) => project.name),
            'demo project name',
        );
        this.ensureUnique(
            DEMO_FIXTURE_CATEGORIES.map((category) => category.id),
            'demo category id',
        );
        this.ensureUnique(
            DEMO_FIXTURE_CATEGORIES.map((category) => category.key),
            'demo category key',
        );
        this.ensureUnique(
            DEMO_FIXTURE_REQUIREMENTS.map((requirement) => requirement.id),
            'demo requirement id',
        );
        this.ensureUnique(
            DEMO_FIXTURE_REQUIREMENTS.map((requirement) => requirement.visibleKey),
            'demo requirement visible key',
        );
    }

    assertResetAllowed(env = process.env): void {
        if (env[DEMO_FIXTURE_RESET_ENV] !== 'true') {
            throw new BadRequestException(`Demo fixture reset requires ${DEMO_FIXTURE_RESET_ENV}=true`);
        }
    }

    async seed(): Promise<DemoFixtureResult> {
        this.validateManifest();
        if ((await this.findFixtureProjects()).length > 0) {
            throw new ConflictException('Demo fixture projects already exist; run demo:reset to recreate them.');
        }
        return this.dataSource.transaction((manager) => this.createFixtureData(manager));
    }

    async reset(env = process.env): Promise<DemoFixtureResult> {
        this.assertResetAllowed(env);
        this.validateManifest();
        return this.dataSource.transaction(async (manager) => {
            await this.deleteFixtureData(manager);
            return this.createFixtureData(manager);
        });
    }

    async findFixtureProjects(): Promise<Project[]> {
        return this.projects.find({ where: { id: In(DEMO_FIXTURE_PROJECTS.map((project) => project.id)) } });
    }

    private async createFixtureData(manager: EntityManager): Promise<DemoFixtureResult> {
        await this.ensureNoFixtureIdConflicts(manager);
        const categoryIdsByFixtureId = await this.ensureCategories(manager);
        await manager.save(
            Project,
            DEMO_FIXTURE_PROJECTS.map((project) =>
                manager.create(Project, {
                    id: project.id,
                    name: project.name,
                    createdAt: DEMO_FIXTURE_TIMESTAMP,
                    updatedAt: DEMO_FIXTURE_TIMESTAMP,
                }),
            ),
        );
        await manager.save(
            Metric,
            DEMO_FIXTURE_METRICS.map((metric) =>
                manager.create(Metric, {
                    ...metric,
                    createdAt: DEMO_FIXTURE_TIMESTAMP,
                    updatedAt: DEMO_FIXTURE_TIMESTAMP,
                }),
            ),
        );
        await manager.save(
            Requirement,
            DEMO_FIXTURE_REQUIREMENTS.map((fixtureRequirement) =>
                manager.create(Requirement, {
                    ...fixtureRequirement,
                    categoryId:
                        categoryIdsByFixtureId.get(fixtureRequirement.categoryId) ?? fixtureRequirement.categoryId,
                    description: this.descriptionFor(fixtureRequirement.legacyId, fixtureRequirement.description),
                    rejectionReason:
                        fixtureRequirement.status === RequirementStatus.Rejected ? 'Demo rejected state.' : null,
                    reviewer: fixtureRequirement.status === RequirementStatus.Rejected ? 'Demo Reviewer' : null,
                    rejectedAt:
                        fixtureRequirement.status === RequirementStatus.Rejected ? DEMO_FIXTURE_TIMESTAMP : null,
                    deletedAt: null,
                    approvedAt:
                        (
                            fixtureRequirement.status === RequirementStatus.Approved
                            || fixtureRequirement.status === RequirementStatus.Implemented
                            || fixtureRequirement.status === RequirementStatus.Obsolete
                        ) ?
                            DEMO_FIXTURE_TIMESTAMP
                        :   null,
                    implementedAt:
                        fixtureRequirement.status === RequirementStatus.Implemented ? DEMO_FIXTURE_TIMESTAMP : null,
                    obsolescenceReason:
                        fixtureRequirement.status === RequirementStatus.Obsolete ? 'Demo obsolete state.' : null,
                    obsoleteAt:
                        fixtureRequirement.status === RequirementStatus.Obsolete ? DEMO_FIXTURE_TIMESTAMP : null,
                    createdAt: DEMO_FIXTURE_TIMESTAMP,
                    updatedAt: DEMO_FIXTURE_TIMESTAMP,
                }),
            ),
        );
        await this.createMetricLinks(manager);
        await this.createRequirementLinks(manager);
        await this.createRevisions(manager, categoryIdsByFixtureId);
        await this.createCounters(manager, categoryIdsByFixtureId);
        return this.result();
    }

    private async ensureNoFixtureIdConflicts(manager: EntityManager): Promise<void> {
        const existingProjects = await manager.count(Project, {
            where: { id: In(DEMO_FIXTURE_PROJECTS.map((p) => p.id)) },
        });
        const existingRequirements = await manager.count(Requirement, {
            where: { id: In(DEMO_FIXTURE_REQUIREMENTS.map((r) => r.id)) },
        });
        const existingMetrics = await manager.count(Metric, {
            where: { id: In(DEMO_FIXTURE_METRICS.map((m) => m.id)) },
        });
        if (existingProjects + existingRequirements + existingMetrics > 0) {
            throw new ConflictException('Demo fixture ids already exist; run demo:reset to recreate them.');
        }
    }

    private async ensureCategories(manager: EntityManager): Promise<Map<string, string>> {
        const categoryIdsByFixtureId = new Map<string, string>();
        for (const fixtureCategory of DEMO_FIXTURE_CATEGORIES) {
            const existing = await manager.findOne(Category, {
                where: [{ id: fixtureCategory.id }, { key: fixtureCategory.key }],
            });
            if (existing) {
                if (existing.key !== fixtureCategory.key) {
                    throw new ConflictException(
                        `Demo category id "${fixtureCategory.id}" conflicts with existing category key "${existing.key}".`,
                    );
                }
                if (existing.name !== fixtureCategory.name || existing.type !== fixtureCategory.type) {
                    throw new ConflictException(
                        `Category key "${fixtureCategory.key}" conflicts with existing category data.`,
                    );
                }
                categoryIdsByFixtureId.set(fixtureCategory.id, existing.id);
            } else {
                const created = await manager.save(
                    Category,
                    manager.create(Category, {
                        ...fixtureCategory,
                        createdAt: DEMO_FIXTURE_TIMESTAMP,
                        updatedAt: DEMO_FIXTURE_TIMESTAMP,
                    }),
                );
                categoryIdsByFixtureId.set(fixtureCategory.id, created.id);
            }
        }
        return categoryIdsByFixtureId;
    }

    private async createMetricLinks(manager: EntityManager): Promise<void> {
        const firstRequirementByProject = new Map<string, string>();
        for (const requirement of DEMO_FIXTURE_REQUIREMENTS) {
            if (!firstRequirementByProject.has(requirement.projectId)) {
                firstRequirementByProject.set(requirement.projectId, requirement.id);
            }
        }
        await manager.save(
            RequirementMetricLink,
            DEMO_FIXTURE_METRICS.map((metric) =>
                manager.create(RequirementMetricLink, {
                    requirementId: firstRequirementByProject.get(metric.projectId),
                    metricId: metric.id,
                    createdAt: DEMO_FIXTURE_TIMESTAMP,
                }),
            ),
        );
    }

    private async createRequirementLinks(manager: EntityManager): Promise<void> {
        await manager.save(
            RequirementLink,
            DEMO_FIXTURE_REQUIREMENT_LINKS.map((link) =>
                manager.create(RequirementLink, {
                    ...link,
                    relationshipType: RequirementLinkRelationshipType.References,
                    deletedAt: null,
                    createdAt: DEMO_FIXTURE_TIMESTAMP,
                    updatedAt: DEMO_FIXTURE_TIMESTAMP,
                }),
            ),
        );
    }

    private async createRevisions(
        manager: EntityManager,
        categoryIdsByFixtureId: ReadonlyMap<string, string>,
    ): Promise<void> {
        const transitionedRequirements = DEMO_FIXTURE_REQUIREMENTS.filter(
            (requirement) => requirement.status !== RequirementStatus.Draft,
        );
        await manager.save(
            RequirementRevision,
            transitionedRequirements.map((requirement) =>
                manager.create(RequirementRevision, {
                    id: this.fixedId('revision', `${requirement.legacyId}:1`),
                    requirementId: requirement.id,
                    revisionNumber: 1,
                    visibleKey: requirement.visibleKey,
                    type: requirement.type,
                    projectId: requirement.projectId,
                    categoryId: categoryIdsByFixtureId.get(requirement.categoryId) ?? requirement.categoryId,
                    sequenceNumber: requirement.sequenceNumber,
                    status: RequirementStatus.Draft,
                    description: this.descriptionFor(requirement.legacyId, requirement.description),
                    priority: requirement.priority,
                    owner: requirement.owner,
                    rationale: requirement.rationale,
                    source: requirement.source,
                    rejectionReason: null,
                    reviewer: null,
                    rejectedAt: null,
                    deletedAt: null,
                    approvedAt: null,
                    implementedAt: null,
                    obsolescenceReason: null,
                    obsoleteAt: null,
                    requirementCreatedAt: DEMO_FIXTURE_TIMESTAMP,
                    requirementUpdatedAt: DEMO_FIXTURE_TIMESTAMP,
                    createdAt: DEMO_FIXTURE_TIMESTAMP,
                }),
            ),
        );
    }

    private async createCounters(
        manager: EntityManager,
        categoryIdsByFixtureId: ReadonlyMap<string, string>,
    ): Promise<void> {
        await manager.save(
            RequirementsKeyCounter,
            DEMO_FIXTURE_CATEGORIES.map((category) => {
                const nextNumber =
                    Math.max(
                        0,
                        ...DEMO_FIXTURE_REQUIREMENTS.filter(
                            (requirement) => requirement.categoryId === category.id,
                        ).map((requirement) => requirement.sequenceNumber),
                    ) + 1;
                return manager.create(RequirementsKeyCounter, {
                    id: this.fixedId('counter', category.key),
                    categoryId: categoryIdsByFixtureId.get(category.id) ?? category.id,
                    nextNumber,
                });
            }),
        );
    }

    private async deleteFixtureData(manager: EntityManager): Promise<void> {
        const projectIds = DEMO_FIXTURE_PROJECTS.map((project) => project.id);
        const fixtureCategoryIds = DEMO_FIXTURE_CATEGORIES.map((category) => category.id);
        const nonFixtureUse = await manager
            .createQueryBuilder(Requirement, 'requirement')
            .where('requirement.category_id IN (:...fixtureCategoryIds)', { fixtureCategoryIds })
            .andWhere('requirement.project_id NOT IN (:...projectIds)', { projectIds })
            .getCount();
        if (nonFixtureUse > 0)
            throw new ConflictException('Cannot reset demo fixture while non-demo requirements use demo categories.');
        await manager.delete(RequirementMetricLink, { requirementId: In(DEMO_FIXTURE_REQUIREMENTS.map((r) => r.id)) });
        await manager.delete(RequirementLink, { id: In(DEMO_FIXTURE_REQUIREMENT_LINKS.map((link) => link.id)) });
        await manager.delete(RequirementRevision, { requirementId: In(DEMO_FIXTURE_REQUIREMENTS.map((r) => r.id)) });
        await manager.delete(Requirement, { id: In(DEMO_FIXTURE_REQUIREMENTS.map((r) => r.id)) });
        await manager.delete(Metric, { id: In(DEMO_FIXTURE_METRICS.map((m) => m.id)) });
        await manager.delete(Project, { id: In(projectIds) });
        await manager.delete(RequirementsKeyCounter, {
            id: In(DEMO_FIXTURE_CATEGORIES.map((category) => this.fixedId('counter', category.key))),
        });
    }

    private fixedId(kind: string, key: string): string {
        const hex = createHash('sha256').update(`requirements-demo-fixture:${kind}:${key}`).digest('hex').slice(0, 32);
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    }

    private descriptionFor(legacyId: string, description: string): string {
        return legacyId.endsWith('-req-1') ? `${description} Demo metric reference [~MET-0001].` : description;
    }

    private result(): DemoFixtureResult {
        return {
            projects: DEMO_FIXTURE_PROJECTS.length,
            categories: DEMO_FIXTURE_CATEGORIES.length,
            requirements: DEMO_FIXTURE_REQUIREMENTS.length,
            requirementLinks: DEMO_FIXTURE_REQUIREMENT_LINKS.length,
            metrics: DEMO_FIXTURE_METRICS.length,
            visibleKeys: DEMO_FIXTURE_REQUIREMENTS.map((requirement) => requirement.visibleKey),
        };
    }

    private ensureUnique(values: readonly string[], label: string): void {
        const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
        if (duplicates.length > 0) throw new ConflictException(`Duplicate ${label}: ${duplicates[0]}`);
    }
}
