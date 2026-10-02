import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Metric } from '@/projects/metrics.entity';
import { Project } from '@/projects/projects.entity';
import { CreateMetricDto } from '@/projects/dto/create-metric.dto';
import { UpdateMetricDto } from '@/projects/dto/update-metric.dto';
import { MetricResponseDto } from '@/projects/dto/metric-response.dto';

@Injectable()
export class MetricsService {
    constructor(
        @InjectRepository(Metric) private readonly metricsRepository: Repository<Metric>,
        private readonly dataSource: DataSource,
    ) {}

    async list(projectId: string): Promise<MetricResponseDto[]> {
        return this.metricsRepository.find({ where: { projectId }, order: { key: 'ASC' } });
    }

    async get(projectId: string, metricId: string): Promise<MetricResponseDto> {
        return this.getOrThrow(projectId, metricId);
    }

    async create(projectId: string, input: CreateMetricDto): Promise<MetricResponseDto> {
        return this.dataSource.transaction(async (manager) => {
            const project = await manager
                .getRepository(Project)
                .createQueryBuilder('project')
                .setLock('pessimistic_write')
                .where('project.id = :projectId', { projectId })
                .getOne();
            if (project === null) throw new NotFoundException('Project was not found.');

            const latest = await manager
                .getRepository(Metric)
                .createQueryBuilder('metric')
                .select('metric.key', 'key')
                .where('metric.project_id = :projectId', { projectId })
                .orderBy('metric.key', 'DESC')
                .limit(1)
                .getRawOne<{ key?: string }>();
            const nextNumber = latest?.key ? Number(latest.key.slice(4)) + 1 : 1;
            if (nextNumber > 9999) throw new BadRequestException('Metric key space is exhausted for this project.');
            const key = `MET-${String(nextNumber).padStart(4, '0')}`;
            const metric = manager
                .getRepository(Metric)
                .create({ projectId, key, value: input.value, description: input.description ?? '', active: true });
            return manager.getRepository(Metric).save(metric);
        });
    }

    async update(projectId: string, metricId: string, input: UpdateMetricDto): Promise<MetricResponseDto> {
        const metric = await this.getOrThrow(projectId, metricId);
        if (input.value !== undefined) metric.value = input.value;
        if (input.description !== undefined) metric.description = input.description;
        return this.metricsRepository.save(metric);
    }

    async deactivate(projectId: string, metricId: string): Promise<MetricResponseDto> {
        const metric = await this.getOrThrow(projectId, metricId);
        metric.active = false;
        return this.metricsRepository.save(metric);
    }

    private async getOrThrow(projectId: string, metricId: string): Promise<Metric> {
        const metric = await this.metricsRepository.findOneBy({ id: metricId, projectId });
        if (metric === null) throw new NotFoundException('Metric was not found.');
        return metric;
    }
}
