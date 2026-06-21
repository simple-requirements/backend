import { Metric } from '@/metrics/metric.entity';
import { RequirementMetricLink } from '@/metrics/requirement-metric-link.entity';
import { Project } from '@/projects/project.entity';
import { Category } from '@/categories/category.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { RequirementsKeyCounter } from '@/requirements/requirements-key-counter.entity';
import { RequirementsController } from '@/requirements/requirements.controller';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { RequirementsService } from '@/requirements/requirements.service';
import { RequirementLink } from '@/requirements/requirement-link.entity';
import { RequirementLinksController } from '@/requirements/requirement-links.controller';
import { RequirementLinksService } from '@/requirements/requirement-links.service';

/**
 * NestJS feature module for requirement allocation, lifecycle, and revision components.
 *
 * The module registers all requirement-related repositories so services can run transactional allocation and mutation logic against PostgreSQL.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Category,
            Project,
            Requirement,
            RequirementRevision,
            RequirementsKeyCounter,
            Metric,
            RequirementMetricLink,
            RequirementLink,
        ]),
    ],
    controllers: [RequirementsController, RequirementLinksController],
    providers: [RequirementsKeyAllocatorService, RequirementsService, RequirementLinksService],
    exports: [RequirementsKeyAllocatorService, RequirementsService],
})
export class RequirementsModule {}
