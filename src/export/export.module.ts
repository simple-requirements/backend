import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '@/auth/auth.module';
import { ExportAdapterRegistryService } from '@/export/export-adapter-registry.service';
import { ExportBundleBuilderService } from '@/export/export-bundle-builder.service';
import { ExportController } from '@/export/export.controller';
import { ExportService } from '@/export/export.service';
import { OperationalExportGuard } from '@/export/operational-export.guard';
import { Category } from '@/projects/categories.entity';
import { Metric } from '@/projects/metrics.entity';
import { Project } from '@/projects/projects.entity';
import { RequirementLink } from '@/projects/requirement-links.entity';
import { RequirementRevision } from '@/projects/requirement-revisions.entity';
import { Requirement } from '@/projects/requirements.entity';

@Module({
    imports: [
        AuthModule,
        TypeOrmModule.forFeature([Project, Category, Requirement, RequirementRevision, Metric, RequirementLink]),
    ],
    controllers: [ExportController],
    providers: [ExportAdapterRegistryService, ExportBundleBuilderService, ExportService, OperationalExportGuard],
})
// Nest modules are declarative; the decorator contains the module configuration.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ExportModule {}
