import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateMetricDto } from '@/metrics/dto/create-metric.dto';
import type { MetricResponseDto } from '@/metrics/dto/metric-response.dto';
import { MetricsController } from '@/metrics/metrics.controller';
import { MetricsService } from '@/metrics/metrics.service';

describe('MetricsController', () => {
    let controller: MetricsController;

    const metric: MetricResponseDto = {
        id: '22222222-2222-4222-8222-222222222222',
        projectId: '11111111-1111-4111-8111-111111111111',
        key: 'MET-0001',
        value: '2000 ms',
        description: 'Max. latency',
        createdAt: '2026-06-12T00:00:00.000Z',
        updatedAt: '2026-06-12T00:00:00.000Z',
    };

    const metricsServiceMock = { create: vi.fn(), findAll: vi.fn(), findOne: vi.fn(), findByKey: vi.fn() };

    beforeEach(async () => {
        vi.clearAllMocks();

        const moduleRef = await Test.createTestingModule({
            controllers: [MetricsController],
            providers: [{ provide: MetricsService, useValue: metricsServiceMock }],
        }).compile();

        controller = moduleRef.get(MetricsController);
    });

    it('delegates metric creation to the service.', async () => {
        const dto: CreateMetricDto = {
            projectId: metric.projectId,
            key: metric.key,
            value: metric.value,
            description: metric.description,
        };
        metricsServiceMock.create.mockResolvedValue(metric);

        await expect(controller.create(dto)).resolves.toEqual(metric);

        expect(metricsServiceMock.create).toHaveBeenCalledWith(dto);
    });

    it('returns project metrics from the service.', async () => {
        metricsServiceMock.findAll.mockResolvedValue([metric]);

        await expect(controller.findAll(metric.projectId)).resolves.toEqual([metric]);

        expect(metricsServiceMock.findAll).toHaveBeenCalledWith(metric.projectId);
    });

    it('retrieves metrics by key and project.', async () => {
        metricsServiceMock.findByKey.mockResolvedValue(metric);

        await expect(controller.findByKey(metric.key, metric.projectId)).resolves.toEqual(metric);

        expect(metricsServiceMock.findByKey).toHaveBeenCalledWith(metric.projectId, metric.key);
    });

    it('retrieves metrics by internal ID.', async () => {
        metricsServiceMock.findOne.mockResolvedValue(metric);

        await expect(controller.findOne(metric.id)).resolves.toEqual(metric);

        expect(metricsServiceMock.findOne).toHaveBeenCalledWith(metric.id);
    });

    it('propagates service errors.', async () => {
        const error = new NotFoundException('Metric was not found');
        metricsServiceMock.findOne.mockRejectedValue(error);

        await expect(controller.findOne(metric.id)).rejects.toBe(error);
    });
});
