import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { Requirement } from '@/requirements/requirements.entity';
import { RequirementsService } from '@/requirements/requirements.service';

const baseRequirement: Requirement = {
    id: 'adf3f623-ef79-49f9-8148-2b43efe903bb',
    type: RequirementType.NFR,
    categoryId: '57eb6e68-1b15-48ea-b976-8fbdb2bfc802',
    sequenceNumber: 1,
    visibleKey: 'NFR-PERF-0001',
    status: RequirementStatus.Draft,
    description: null,
    priority: null,
    owner: null,
    rationale: null,
    source: null,
    createdAt: new Date('2026-06-12T00:00:00.000Z'),
    updatedAt: new Date('2026-06-12T00:00:00.000Z'),
    category: {
        id: '57eb6e68-1b15-48ea-b976-8fbdb2bfc802',
        name: 'Performance',
        key: 'PERF',
        createdAt: new Date('2026-06-12T00:00:00.000Z'),
        updatedAt: new Date('2026-06-12T00:00:00.000Z'),
    },
};

describe('RequirementsService', () => {
    let service: RequirementsService;

    const requirementsRepositoryMock = { find: vi.fn(), findOne: vi.fn(), save: vi.fn() };

    const requirementsKeyAllocatorServiceMock = { allocate: vi.fn() };

    beforeEach(async () => {
        vi.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequirementsService,
                { provide: getRepositoryToken(Requirement), useValue: requirementsRepositoryMock },
                { provide: RequirementsKeyAllocatorService, useValue: requirementsKeyAllocatorServiceMock },
            ],
        }).compile();

        service = module.get<RequirementsService>(RequirementsService);
    });

    it('creates a draft requirement with an allocated visible key.', async () => {
        const dto: CreateRequirementDto = {
            type: RequirementType.NFR,
            categoryId: baseRequirement.categoryId,
            description: ' The API responds quickly. ',
            priority: ' high ',
            owner: ' ',
            rationale: ' Latency impacts users. ',
            source: ' US-REQ-001 ',
        };

        requirementsKeyAllocatorServiceMock.allocate.mockResolvedValue({
            id: baseRequirement.id,
            type: baseRequirement.type,
            categoryId: baseRequirement.categoryId,
            sequenceNumber: baseRequirement.sequenceNumber,
            visibleKey: baseRequirement.visibleKey,
        });
        requirementsRepositoryMock.findOne.mockResolvedValue({ ...baseRequirement });
        requirementsRepositoryMock.save.mockImplementation((requirement: Requirement) =>
            Promise.resolve({ ...requirement, updatedAt: new Date('2026-06-12T00:00:01.000Z') }),
        );

        await expect(service.create(dto)).resolves.toEqual({
            id: baseRequirement.id,
            visibleKey: baseRequirement.visibleKey,
            type: RequirementType.NFR,
            categoryId: baseRequirement.categoryId,
            sequenceNumber: 1,
            status: RequirementStatus.Draft,
            description: 'The API responds quickly.',
            priority: 'high',
            owner: null,
            rationale: 'Latency impacts users.',
            source: 'US-REQ-001',
            createdAt: '2026-06-12T00:00:00.000Z',
            updatedAt: '2026-06-12T00:00:01.000Z',
        });

        expect(requirementsKeyAllocatorServiceMock.allocate).toHaveBeenCalledWith(RequirementType.NFR, dto.categoryId);
    });

    it('rejects requirement creation with missing required fields.', async () => {
        await expect(
            // @ts-expect-error -- The type field has to be left out to make this test meaningful
            service.create({ categoryId: baseRequirement.categoryId, description: 'Description', priority: 'high' }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementsKeyAllocatorServiceMock.allocate).not.toHaveBeenCalled();
    });

    it('retrieves a requirement by internal ID.', async () => {
        requirementsRepositoryMock.findOne.mockResolvedValue({
            ...baseRequirement,
            description: 'The API responds quickly.',
            priority: 'high',
        });

        await expect(service.findOne(baseRequirement.id)).resolves.toEqual(
            expect.objectContaining({ id: baseRequirement.id, visibleKey: baseRequirement.visibleKey }),
        );
    });

    it('retrieves a requirement by visible key.', async () => {
        requirementsRepositoryMock.findOne.mockResolvedValue({
            ...baseRequirement,
            description: 'The API responds quickly.',
            priority: 'high',
        });

        await expect(service.findByVisibleKey(baseRequirement.visibleKey)).resolves.toEqual(
            expect.objectContaining({ id: baseRequirement.id, visibleKey: baseRequirement.visibleKey }),
        );
    });

    it('rejects malformed visible keys.', async () => {
        await expect(service.findByVisibleKey('invalid-key')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lists requirements ordered by visible key.', async () => {
        requirementsRepositoryMock.find.mockResolvedValue([
            { ...baseRequirement, description: 'The API responds quickly.', priority: 'high' },
        ]);

        await expect(service.findAll()).resolves.toEqual([
            expect.objectContaining({ id: baseRequirement.id, visibleKey: baseRequirement.visibleKey }),
        ]);

        expect(requirementsRepositoryMock.find).toHaveBeenCalledWith({ order: { visibleKey: 'ASC' } });
    });

    it('throws not found when a requirement cannot be retrieved.', async () => {
        requirementsRepositoryMock.findOne.mockResolvedValue(null);

        await expect(service.findOne(baseRequirement.id)).rejects.toBeInstanceOf(NotFoundException);
    });
});
