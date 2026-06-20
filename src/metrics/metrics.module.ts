import { Project } from '@/projects/project.entity';
import { Metric } from '@/metrics/metric.entity';
import { RequirementMetricLink } from '@/metrics/requirement-metric-link.entity';
import { MetricsController } from '@/metrics/metrics.controller';
import { MetricsService } from '@/metrics/metrics.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
    imports: [TypeOrmModule.forFeature([Metric, Project, RequirementMetricLink])],
    controllers: [MetricsController],
    providers: [MetricsService],
    exports: [MetricsService],
})
export class MetricsModule {}
