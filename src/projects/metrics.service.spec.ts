import type { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Metric } from '@/projects/metrics.entity';
import { MetricsService } from '@/projects/metrics.service';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const METRIC_ID = '22222222-2222-4222-8222-222222222222';

function metric(overrides: Partial<Metric> = {}): Metric {
    return {
        id: METRIC_ID,
        projectId: PROJECT_ID,
        key: 'MET-0001',
        value: '2000 ms',
        description: 'Response time',
        active: true,
        createdAt: new Date('2026-09-30T10:00:00.000Z'),
        updatedAt: new Date('2026-09-30T10:00:00.000Z'),
        ...overrides,
    } as Metric;
}

describe('MetricsService', () => {
    const repository = { find: vi.fn(), findOneBy: vi.fn(), save: vi.fn() };
    const dataSource = { transaction: vi.fn() };
    const service = new MetricsService(
        repository as unknown as Repository<Metric>,
        dataSource as unknown as DataSource,
    );

    beforeEach(() => vi.resetAllMocks());

    it('lists metrics in key order.', async () => {
        repository.find.mockResolvedValue([metric()]);
        await expect(service.list(PROJECT_ID)).resolves.toHaveLength(1);
        expect(repository.find).toHaveBeenCalledWith({ where: { projectId: PROJECT_ID }, order: { key: 'ASC' } });
    });

    it('updates only mutable metric fields.', async () => {
        const existing = metric();
        repository.findOneBy.mockResolvedValue(existing);
        repository.save.mockImplementation((value) => Promise.resolve(value));

        const result = await service.update(PROJECT_ID, METRIC_ID, { value: '1000 ms', description: 'New target' });

        expect(result.key).toBe('MET-0001');
        expect(result.value).toBe('1000 ms');
        expect(result.description).toBe('New target');
    });

    it('deactivates without deleting the metric.', async () => {
        const existing = metric();
        repository.findOneBy.mockResolvedValue(existing);
        repository.save.mockImplementation((value) => Promise.resolve(value));

        await expect(service.deactivate(PROJECT_ID, METRIC_ID)).resolves.toMatchObject({ active: false });
        expect(repository.save).toHaveBeenCalledOnce();
    });

    it('rejects access to a metric outside the project.', async () => {
        repository.findOneBy.mockResolvedValue(null);
        await expect(service.get(PROJECT_ID, METRIC_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects allocation after MET-9999.', async () => {
        const projectQuery = { setLock: vi.fn(), where: vi.fn(), getOne: vi.fn() };
        projectQuery.setLock.mockReturnValue(projectQuery);
        projectQuery.where.mockReturnValue(projectQuery);
        projectQuery.getOne.mockResolvedValue({ id: PROJECT_ID });
        const metricQuery = { select: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), getRawOne: vi.fn() };
        metricQuery.select.mockReturnValue(metricQuery);
        metricQuery.where.mockReturnValue(metricQuery);
        metricQuery.orderBy.mockReturnValue(metricQuery);
        metricQuery.limit.mockReturnValue(metricQuery);
        metricQuery.getRawOne.mockResolvedValue({ key: 'MET-9999' });
        const projectRepo = { createQueryBuilder: vi.fn().mockReturnValue(projectQuery) };
        const metricRepo = { createQueryBuilder: vi.fn().mockReturnValue(metricQuery) };
        const manager = { getRepository: vi.fn().mockReturnValueOnce(projectRepo).mockReturnValue(metricRepo) };
        dataSource.transaction.mockImplementation(
            (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager),
        );

        await expect(service.create(PROJECT_ID, { value: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    });
});
