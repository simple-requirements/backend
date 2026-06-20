import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Metric } from '@/metrics/metric.entity';
import { MetricsService } from '@/metrics/metrics.service';
import { Project } from '@/projects/project.entity';

const fixedDate = new Date('2026-06-12T00:00:00.000Z');
const project: Project = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Metrics Project',
    createdAt: fixedDate,
    updatedAt: fixedDate,
};
const metric: Metric = {
    id: '22222222-2222-4222-8222-222222222222',
    projectId: project.id,
    key: 'MET-0001',
    value: '2000 ms',
    description: 'Max. latency',
    createdAt: fixedDate,
    updatedAt: fixedDate,
    project,
};

describe('MetricsService', () => {
    let service: MetricsService;

    const metricsRepositoryMock = { create: vi.fn(), save: vi.fn(), findOne: vi.fn(), find: vi.fn() };
    const projectsRepositoryMock = { findOne: vi.fn() };

    beforeEach(async () => {
        vi.clearAllMocks();
        projectsRepositoryMock.findOne.mockResolvedValue(project);
        metricsRepositoryMock.create.mockImplementation((value: Partial<Metric>) => value);
        metricsRepositoryMock.save.mockImplementation((value: Partial<Metric>) =>
            Promise.resolve({ ...metric, ...value }),
        );

        const moduleRef = await Test.createTestingModule({
            providers: [
                MetricsService,
                { provide: getRepositoryToken(Metric), useValue: metricsRepositoryMock },
                { provide: getRepositoryToken(Project), useValue: projectsRepositoryMock },
            ],
        }).compile();

        service = moduleRef.get(MetricsService);
    });

    it('creates a project-scoped metric with trimmed values.', async () => {
        metricsRepositoryMock.findOne.mockResolvedValue(null);

        await expect(
            service.create({
                projectId: project.id,
                key: 'MET-0001',
                value: ' 2000 ms ',
                description: ' Max. latency ',
            }),
        ).resolves.toEqual(
            expect.objectContaining({
                projectId: project.id,
                key: 'MET-0001',
                value: '2000 ms',
                description: 'Max. latency',
            }),
        );
    });

    it.each([
        ['MET0001', '2000 ms'],
        ['met-0001', '2000 ms'],
        ['MET-0001', '   '],
    ])('rejects invalid metric input key=%s value=%s.', async (key, value) => {
        await expect(service.create({ projectId: project.id, key, value })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate metric keys within a project.', async () => {
        metricsRepositoryMock.findOne.mockResolvedValue(metric);

        await expect(
            service.create({ projectId: project.id, key: metric.key, value: metric.value }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lists metrics by project.', async () => {
        metricsRepositoryMock.find.mockResolvedValue([metric]);

        await expect(service.findAll(project.id)).resolves.toEqual([expect.objectContaining({ id: metric.id })]);
    });

    it('retrieves metrics by id and by project key.', async () => {
        metricsRepositoryMock.findOne.mockResolvedValue(metric);

        await expect(service.findOne(metric.id)).resolves.toEqual(expect.objectContaining({ id: metric.id }));
        await expect(service.findByKey(project.id, metric.key)).resolves.toEqual(
            expect.objectContaining({ id: metric.id }),
        );
    });

    it('throws not found for missing projects or metrics.', async () => {
        projectsRepositoryMock.findOne.mockResolvedValueOnce(null);
        await expect(service.findAll(project.id)).rejects.toBeInstanceOf(NotFoundException);

        projectsRepositoryMock.findOne.mockResolvedValue(project);
        metricsRepositoryMock.findOne.mockResolvedValue(null);
        await expect(service.findByKey(project.id, metric.key)).rejects.toBeInstanceOf(NotFoundException);
    });
});
