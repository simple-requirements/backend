import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryType } from '@/projects/category-type.enum';
import type { RequirementLink } from '@/projects/requirement-links.entity';
import { RequirementLinksService } from '@/projects/requirement-links.service';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import type { Requirement } from '@/projects/requirements.entity';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_ID = '22222222-2222-4222-8222-222222222222';
const TARGET_ID = '33333333-3333-4333-8333-333333333333';
const SECOND_TARGET_ID = '44444444-4444-4444-8444-444444444444';

function requirement(
    id: string,
    visibleKey: string,
    type: CategoryType = CategoryType.FR,
): Requirement {
    return {
        id,
        projectId: PROJECT_ID,
        categoryId: `${id.slice(0, -1)}5`,
        visibleKey,
        status: RequirementStatus.Draft,
        category: {
            id: `${id.slice(0, -1)}5`,
            projectId: PROJECT_ID,
            name: type === CategoryType.FR ? 'Functional' : 'Performance',
            key: type === CategoryType.FR ? 'FUNC' : 'PERF',
            type,
        },
    } as Requirement;
}

function link(source: Requirement, target: Requirement): RequirementLink {
    return {
        id: '55555555-5555-4555-8555-555555555555',
        projectId: PROJECT_ID,
        sourceRequirementId: source.id,
        targetRequirementId: target.id,
        relationshipType: 'references',
        sourceRequirement: source,
        targetRequirement: target,
        createdAt: new Date('2026-10-02T08:00:00.000Z'),
        updatedAt: new Date('2026-10-02T08:00:00.000Z'),
    } as RequirementLink;
}

describe('RequirementLinksService', () => {
    const linksRepository = {
        find: vi.fn(),
        findOne: vi.fn(),
        existsBy: vi.fn(),
        create: vi.fn((value) => value),
        save: vi.fn(),
        delete: vi.fn(),
    };
    const requirementsRepository = { findOne: vi.fn() };
    const service = new RequirementLinksService(
        linksRepository as unknown as Repository<RequirementLink>,
        requirementsRepository as unknown as Repository<Requirement>,
    );

    const source = requirement(SOURCE_ID, 'FR-FUNC-0001');
    const target = requirement(TARGET_ID, 'NFR-PERF-0001', CategoryType.NFR);
    const secondTarget = requirement(SECOND_TARGET_ID, 'FR-FUNC-0002');

    beforeEach(() => vi.resetAllMocks());

    it('creates a fixed references link after resolving the target visible key.', async () => {
        requirementsRepository.findOne.mockResolvedValueOnce(source).mockResolvedValueOnce(target);
        linksRepository.existsBy.mockResolvedValue(false);
        linksRepository.save.mockImplementation((value) => Promise.resolve({ ...value, id: 'link-id', createdAt: new Date(), updatedAt: new Date() }));

        const result = await service.create(PROJECT_ID, SOURCE_ID, target.visibleKey);

        expect(result.relationshipType).toBe('references');
        expect(result.source.requirementId).toBe(SOURCE_ID);
        expect(result.target.visibleKey).toBe(target.visibleKey);
        expect(linksRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ sourceRequirementId: SOURCE_ID, targetRequirementId: TARGET_ID }),
        );
    });

    it('blocks self-links and duplicate links.', async () => {
        requirementsRepository.findOne.mockResolvedValueOnce(source).mockResolvedValueOnce(source);
        await expect(service.create(PROJECT_ID, SOURCE_ID, source.visibleKey)).rejects.toBeInstanceOf(BadRequestException);

        requirementsRepository.findOne.mockResolvedValueOnce(source).mockResolvedValueOnce(target);
        linksRepository.existsBy.mockResolvedValue(true);
        await expect(service.create(PROJECT_ID, SOURCE_ID, target.visibleKey)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns a clear not-found error for an unknown target key.', async () => {
        requirementsRepository.findOne.mockResolvedValueOnce(source).mockResolvedValueOnce(null);
        await expect(service.create(PROJECT_ID, SOURCE_ID, 'FR-NONE-9999')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('corrects an existing outgoing link without mutating either requirement.', async () => {
        const existing = link(source, target);
        linksRepository.findOne.mockResolvedValue(existing);
        requirementsRepository.findOne.mockResolvedValue(secondTarget);
        linksRepository.existsBy.mockResolvedValue(false);
        linksRepository.save.mockImplementation((value) => Promise.resolve(value));

        const result = await service.update(PROJECT_ID, SOURCE_ID, existing.id, secondTarget.visibleKey);

        expect(result.target.requirementId).toBe(SECOND_TARGET_ID);
        expect(source.visibleKey).toBe('FR-FUNC-0001');
        expect(target.visibleKey).toBe('NFR-PERF-0001');
    });

    it('groups links into outgoing and incoming views for one selected requirement.', async () => {
        requirementsRepository.findOne.mockResolvedValue(source);
        linksRepository.find.mockResolvedValue([link(source, target), link(secondTarget, source)]);

        const result = await service.overview(PROJECT_ID, SOURCE_ID);

        expect(result.outgoing.map((item) => item.target.requirementId)).toEqual([TARGET_ID]);
        expect(result.incoming.map((item) => item.source.requirementId)).toEqual([SECOND_TARGET_ID]);
    });
});
