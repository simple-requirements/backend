import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Metric } from '@/projects/metrics.entity';
import { Requirement } from '@/projects/requirements.entity';
import {
    parseMetricReferenceKeys,
    RequirementMetricReferenceService,
} from '@/projects/requirements/requirement-metric-reference.service';

const PROJECT_ID = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b';
const OTHER_PROJECT_ID = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2c';

function metric(key: string, active = true, id = key): Metric {
    return Object.assign(new Metric(), { id, projectId: PROJECT_ID, key, value: '2000 ms', description: '', active });
}

function requirement(metrics: Metric[] = []): Requirement {
    return Object.assign(new Requirement(), { projectId: PROJECT_ID, metrics });
}

describe('parseMetricReferenceKeys', () => {
    it('parses valid placeholders, deduplicates them, and ignores malformed metric-like text.', () => {
        expect(
            parseMetricReferenceKeys('Use [~MET-0001], [~MET-0001], [~MET-0042], [~UNKNOWN], [~MET-123], [~met-0002].'),
        ).toEqual(['MET-0001', 'MET-0042']);
    });
});

describe('RequirementMetricReferenceService', () => {
    let service: RequirementMetricReferenceService;
    const metricsRepository = { find: vi.fn() };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequirementMetricReferenceService,
                { provide: getRepositoryToken(Metric), useValue: metricsRepository },
            ],
        }).compile();
        service = module.get(RequirementMetricReferenceService);
    });

    beforeEach(() => vi.resetAllMocks());

    it('resolves only project-local metrics and reports unknown valid keys as unresolved.', async () => {
        metricsRepository.find.mockResolvedValue([metric('MET-0001')]);

        await expect(service.describe(PROJECT_ID, '[~MET-0001] and [~MET-9999]')).resolves.toEqual([
            { key: 'MET-0001', metricId: 'MET-0001', value: '2000 ms', resolved: true, active: true },
            { key: 'MET-9999', metricId: null, value: null, resolved: false, active: null },
        ]);
        expect(metricsRepository.find).toHaveBeenCalledWith({
            where: { projectId: PROJECT_ID, key: expect.anything() },
            order: { key: 'ASC' },
        });
        expect(metricsRepository.find).not.toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: OTHER_PROJECT_ID } }));
    });

    it('deduplicates resolved relations and permits unresolved keys to remain in raw text.', async () => {
        const first = metric('MET-0001');
        metricsRepository.find.mockResolvedValue([first]);

        await expect(
            service.prepareForDescription(requirement(), '[~MET-0001] again [~MET-0001], unknown [~MET-9999]'),
        ).resolves.toEqual([first]);
    });

    it('rejects a newly introduced reference to a deactivated metric.', async () => {
        const inactive = metric('MET-0001', false);
        metricsRepository.find.mockResolvedValue([inactive]);

        await expect(service.prepareForDescription(requirement(), '[~MET-0001]')).rejects.toThrow(BadRequestException);
    });

    it('keeps an existing reference valid after the metric is deactivated.', async () => {
        const inactive = metric('MET-0001', false);
        metricsRepository.find.mockResolvedValue([inactive]);

        await expect(service.prepareForDescription(requirement([inactive]), '[~MET-0001]')).resolves.toEqual([inactive]);
    });

    it('removes relations when placeholders are removed.', async () => {
        expect(await service.prepareForDescription(requirement([metric('MET-0001')]), 'No metric reference now.')).toEqual([]);
        expect(metricsRepository.find).not.toHaveBeenCalled();
    });
});
