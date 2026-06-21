import { Category } from '@/categories/category.entity';
import { Metric } from '@/metrics/metric.entity';
import { RequirementMetricLink } from '@/metrics/requirement-metric-link.entity';
import { Project } from '@/projects/project.entity';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementsKeyCounter } from '@/requirements/requirements-key-counter.entity';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { RequirementsService } from '@/requirements/requirements.service';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
    DEMO_FIXTURE_CATEGORIES,
    DEMO_FIXTURE_METRICS,
    DEMO_FIXTURE_PROJECTS,
    DEMO_FIXTURE_REQUIREMENTS,
    DEMO_FIXTURE_RESET_ENV,
} from './demo-workspace.fixture';

export interface DemoFixtureResult {
    projects: number;
    categories: number;
    requirements: number;
    metrics: number;
    visibleKeys: string[];
}

@Injectable()
export class DemoFixtureService {
    constructor(
        @InjectRepository(Project) private readonly projects: Repository<Project>,
        @InjectRepository(Category) private readonly categories: Repository<Category>,
        @InjectRepository(Metric) private readonly metrics: Repository<Metric>,
        @InjectRepository(Requirement) private readonly requirements: Repository<Requirement>,
        @InjectRepository(RequirementRevision) private readonly revisions: Repository<RequirementRevision>,
        @InjectRepository(RequirementMetricLink) private readonly links: Repository<RequirementMetricLink>,
        @InjectRepository(RequirementsKeyCounter) private readonly counters: Repository<RequirementsKeyCounter>,
        private readonly requirementsService: RequirementsService,
    ) {}

    validateManifest(): void {
        this.ensureUnique(
            DEMO_FIXTURE_PROJECTS.map((project) => project.name),
            'demo project name',
        );
        this.ensureUnique(
            DEMO_FIXTURE_CATEGORIES.map((category) => category.key),
            'demo category key',
        );
        this.ensureUnique(
            DEMO_FIXTURE_REQUIREMENTS.map((requirement) => requirement.legacyId),
            'demo requirement legacy id',
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
        return this.createFixtureData();
    }

    async reset(env = process.env): Promise<DemoFixtureResult> {
        this.assertResetAllowed(env);
        this.validateManifest();
        await this.deleteFixtureData();
        return this.createFixtureData();
    }

    async findFixtureProjects(): Promise<Project[]> {
        return this.projects.find({ where: { name: In(DEMO_FIXTURE_PROJECTS.map((project) => project.name)) } });
    }

    private async createFixtureData(): Promise<DemoFixtureResult> {
        const categoryByKey = await this.ensureCategories();
        const projectByLegacyId = new Map<string, Project>();
        for (const fixtureProject of DEMO_FIXTURE_PROJECTS) {
            const project = await this.projects.save(this.projects.create({ name: fixtureProject.name }));
            projectByLegacyId.set(fixtureProject.legacyId, project);
            for (const metric of DEMO_FIXTURE_METRICS) {
                await this.metrics.save(this.metrics.create({ projectId: project.id, ...metric }));
            }
        }

        const visibleKeys: string[] = [];
        for (const fixtureRequirement of DEMO_FIXTURE_REQUIREMENTS) {
            const project = projectByLegacyId.get(fixtureRequirement.legacyProjectId);
            const category = categoryByKey.get(fixtureRequirement.categoryKey);
            if (!project || !category)
                throw new ConflictException(`Invalid demo fixture requirement ${fixtureRequirement.legacyId}`);
            const description =
                fixtureRequirement.legacyId.endsWith('-req-1') ?
                    `${fixtureRequirement.description} Demo metric reference [~MET-0001].`
                :   fixtureRequirement.description;
            const created = await this.requirementsService.create({
                projectId: project.id,
                categoryId: category.id,
                description,
                priority: fixtureRequirement.priority,
                owner: fixtureRequirement.owner,
                rationale: fixtureRequirement.rationale,
                source: fixtureRequirement.source,
            });
            visibleKeys.push(created.visibleKey);
            await this.applyStatus(created.id, fixtureRequirement.status);
        }
        return {
            projects: DEMO_FIXTURE_PROJECTS.length,
            categories: DEMO_FIXTURE_CATEGORIES.length,
            requirements: DEMO_FIXTURE_REQUIREMENTS.length,
            metrics: DEMO_FIXTURE_PROJECTS.length * DEMO_FIXTURE_METRICS.length,
            visibleKeys,
        };
    }

    private async ensureCategories(): Promise<Map<string, Category>> {
        const out = new Map<string, Category>();
        for (const fixtureCategory of DEMO_FIXTURE_CATEGORIES) {
            const existing = await this.categories.findOne({ where: { key: fixtureCategory.key } });
            if (existing) {
                if (existing.name !== fixtureCategory.name || existing.type !== fixtureCategory.type) {
                    throw new ConflictException(
                        `Category key "${fixtureCategory.key}" conflicts with existing category data.`,
                    );
                }
                out.set(existing.key, existing);
            } else {
                const saved = await this.categories.save(this.categories.create(fixtureCategory));
                out.set(saved.key, saved);
            }
        }
        return out;
    }

    private async applyStatus(id: string, status: RequirementStatus): Promise<void> {
        if (status === RequirementStatus.Approved) await this.requirementsService.approve(id);
        if (status === RequirementStatus.Implemented) {
            await this.requirementsService.approve(id);
            await this.requirementsService.markImplemented(id);
        }
        if (status === RequirementStatus.Rejected)
            await this.requirementsService.reject(id, {
                rejectionReason: 'Demo rejected state.',
                reviewer: 'Demo Reviewer',
            });
        if (status === RequirementStatus.Obsolete) {
            await this.requirementsService.approve(id);
            await this.requirementsService.markObsolete(id, { obsolescenceReason: 'Demo obsolete state.' });
        }
    }

    private async deleteFixtureData(): Promise<void> {
        const fixtureProjects = await this.findFixtureProjects();
        const projectIds = fixtureProjects.map((project) => project.id);
        if (projectIds.length === 0) return;
        const fixtureCategoryKeys = DEMO_FIXTURE_CATEGORIES.map((category) => category.key);
        const nonFixtureUse = await this.requirements
            .createQueryBuilder('requirement')
            .innerJoin('requirement.category', 'category')
            .where('category.key IN (:...fixtureCategoryKeys)', { fixtureCategoryKeys })
            .andWhere('requirement.project_id NOT IN (:...projectIds)', { projectIds })
            .getCount();
        if (nonFixtureUse > 0)
            throw new ConflictException('Cannot reset demo fixture while non-demo requirements use demo categories.');
        const fixtureRequirements = await this.requirements.find({ where: { projectId: In(projectIds) } });
        const requirementIds = fixtureRequirements.map((requirement) => requirement.id);
        if (requirementIds.length > 0) {
            await this.links.delete({ requirementId: In(requirementIds) });
            await this.revisions.delete({ requirementId: In(requirementIds) });
            await this.requirements.delete({ id: In(requirementIds) });
        }
        await this.metrics.delete({ projectId: In(projectIds) });
        await this.projects.delete({ id: In(projectIds) });
        const categories = await this.categories.find({ where: { key: In(fixtureCategoryKeys) } });
        await this.counters.delete({ categoryId: In(categories.map((category) => category.id)) });
    }

    private ensureUnique(values: readonly string[], label: string): void {
        const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
        if (duplicates.length > 0) throw new ConflictException(`Duplicate ${label}: ${duplicates[0]}`);
    }
}
