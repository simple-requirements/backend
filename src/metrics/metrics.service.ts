import { Project } from '@/projects/project.entity';
import { METRIC_KEY_PATTERN } from '@/metrics/metric-key';
import { CreateMetricDto } from '@/metrics/dto/create-metric.dto';
import { MetricResponseDto } from '@/metrics/dto/metric-response.dto';
import { Metric } from '@/metrics/metric.entity';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class MetricsService {
    constructor(
        @InjectRepository(Metric) private readonly metricsRepository: Repository<Metric>,
        @InjectRepository(Project) private readonly projectsRepository: Repository<Project>,
    ) {}
    async create(dto: CreateMetricDto): Promise<MetricResponseDto> {
        this.validate(dto);
        await this.ensureProject(dto.projectId);
        const existing = await this.metricsRepository.findOne({
            where: { projectId: dto.projectId, key: dto.key.trim() },
        });
        if (existing) throw new ConflictException(`Metric "${dto.key}" already exists in this project`);
        return this.toDto(
            await this.metricsRepository.save(
                this.metricsRepository.create({
                    projectId: dto.projectId,
                    key: dto.key.trim(),
                    value: dto.value.trim(),
                    description: this.optional(dto.description),
                }),
            ),
        );
    }
    async findAll(projectId: string): Promise<MetricResponseDto[]> {
        this.validateProjectId(projectId);
        await this.ensureProject(projectId);
        return (await this.metricsRepository.find({ where: { projectId }, order: { key: 'ASC' } })).map((m) =>
            this.toDto(m),
        );
    }
    async findOne(id: string): Promise<MetricResponseDto> {
        this.validateProjectId(id, 'Metric id must be a valid UUID');
        const metric = await this.metricsRepository.findOne({ where: { id } });
        if (!metric) throw new NotFoundException(`Metric "${id}" was not found`);
        return this.toDto(metric);
    }
    async findByKey(projectId: string, key: string): Promise<MetricResponseDto> {
        this.validateProjectId(projectId);
        if (!METRIC_KEY_PATTERN.test(key)) throw new BadRequestException('Metric key must match MET-0001');
        const metric = await this.metricsRepository.findOne({ where: { projectId, key } });
        if (!metric) throw new NotFoundException(`Metric "${key}" was not found in this project`);
        return this.toDto(metric);
    }
    private validate(dto: CreateMetricDto): void {
        if (!dto || typeof dto !== 'object') throw new BadRequestException('Metric request body is required');
        this.validateProjectId(dto.projectId);
        if (typeof dto.key !== 'string' || !METRIC_KEY_PATTERN.test(dto.key.trim()))
            throw new BadRequestException('Metric key must match MET-0001');
        if (typeof dto.value !== 'string' || dto.value.trim() === '')
            throw new BadRequestException('Metric value is required');
        if (dto.description !== undefined && dto.description !== null && typeof dto.description !== 'string')
            throw new BadRequestException('Metric description must be a string when provided');
    }
    private validateProjectId(id: string, message = 'Metric project id must be a valid UUID'): void {
        if (typeof id !== 'string' || !UUID_PATTERN.test(id)) throw new BadRequestException(message);
    }
    private optional(v: string | null | undefined): string | null {
        return v === undefined || v === null || v.trim() === '' ? null : v.trim();
    }
    private async ensureProject(projectId: string): Promise<void> {
        if ((await this.projectsRepository.findOne({ where: { id: projectId } })) === null)
            throw new NotFoundException(`Project "${projectId}" was not found`);
    }
    private toDto(m: Metric): MetricResponseDto {
        return {
            id: m.id,
            projectId: m.projectId,
            key: m.key,
            value: m.value,
            description: m.description,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
        };
    }
}
