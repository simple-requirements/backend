import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';

import type { RequirementMetricReferenceDto } from '@/projects/dto/requirement-metric-reference.dto';
import { Metric } from '@/projects/metrics.entity';
import { Requirement } from '@/projects/requirements.entity';
import {
    createRequirementMetricSnapshot,
    parseMetricReferenceKeys,
    renderRequirementMetricSnapshot,
    type RequirementMetricSnapshot,
} from '@/projects/requirements/requirement-metric-snapshot';

export { parseMetricReferenceKeys } from '@/projects/requirements/requirement-metric-snapshot';

@Injectable()
export class RequirementMetricReferenceService {
    constructor(@InjectRepository(Metric) private readonly metricsRepository: Repository<Metric>) {}

    async prepareForDescription(requirement: Requirement, description: string | null): Promise<Metric[]> {
        const keys = parseMetricReferenceKeys(description);
        if (keys.length === 0) return [];

        const metrics = await this.findProjectMetrics(requirement.projectId, keys);
        const existingMetricIds = new Set((requirement.metrics ?? []).map((metric) => metric.id));

        for (const metric of metrics) {
            if (!metric.active && !existingMetricIds.has(metric.id)) {
                throw new BadRequestException(`Metric reference "${metric.key}" cannot be added because the metric is deactivated.`);
            }
        }

        return metrics;
    }

    async describe(projectId: string, description: string | null): Promise<RequirementMetricReferenceDto[]> {
        const keys = parseMetricReferenceKeys(description);
        if (keys.length === 0) return [];

        const metrics = await this.findProjectMetrics(projectId, keys);
        const metricsByKey = new Map(metrics.map((metric) => [metric.key, metric]));

        return keys.map((key) => {
            const metric = metricsByKey.get(key);
            return {
                key,
                metricId: metric?.id ?? null,
                value: metric?.value ?? null,
                resolved: metric !== undefined,
                active: metric?.active ?? null,
            };
        });
    }


    snapshot(description: string | null, metrics: readonly Metric[]): RequirementMetricSnapshot[] {
        return createRequirementMetricSnapshot(description, metrics);
    }

    async renderCurrent(projectId: string, description: string | null): Promise<string | null> {
        const keys = parseMetricReferenceKeys(description);
        if (keys.length === 0) return description;

        const metrics = await this.findProjectMetrics(projectId, keys);
        return renderRequirementMetricSnapshot(description, createRequirementMetricSnapshot(description, metrics));
    }

    async unresolvedKeys(projectId: string, description: string | null): Promise<string[]> {
        const references = await this.describe(projectId, description);
        return references.filter((reference) => !reference.resolved).map((reference) => reference.key);
    }

    private async findProjectMetrics(projectId: string, keys: string[]): Promise<Metric[]> {
        return this.metricsRepository.find({ where: { projectId, key: In(keys) }, order: { key: 'ASC' } });
    }
}
