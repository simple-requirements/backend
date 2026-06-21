import { Category } from '@/categories/category.entity';
import { Metric } from '@/metrics/metric.entity';
import { RequirementMetricLink } from '@/metrics/requirement-metric-link.entity';
import { Project } from '@/projects/project.entity';
import { RequirementsKeyCounter } from '@/requirements/requirements-key-counter.entity';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoFixtureService } from './demo-fixture.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Project,
            Category,
            Metric,
            Requirement,
            RequirementRevision,
            RequirementMetricLink,
            RequirementsKeyCounter,
        ]),
    ],
    providers: [DemoFixtureService],
    exports: [DemoFixtureService],
})
export class DemoFixtureModule {}
