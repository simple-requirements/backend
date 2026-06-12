import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsController } from '@/requirements/requirements.controller';
import { RequirementsService } from '@/requirements/requirements.service';

describe('RequirementsController', () => {
    let controller: RequirementsController;

    const requirement: RequirementResponseDto = {
        id: 'adf3f623-ef79-49f9-8148-2b43efe903bb',
        visibleKey: 'NFR-PERF-0001',
        kind: RequirementType.NFR,
        categoryId: '57eb6e68-1b15-48ea-b976-8fbdb2bfc802',
        sequenceNumber: 1,
        status: RequirementStatus.Draft,
        description: 'The API responds quickly.',
        priority: 'high',
        owner: null,
        rationale: 'Latency impacts users.',
        source: 'US-REQ-001',
        createdAt: '2026-06-12T00:00:00.000Z',
        updatedAt: '2026-06-12T00:00:00.000Z',
    };

    const requirementsServiceMock = { create: vi.fn(), findAll: vi.fn(), findOne: vi.fn(), findByVisibleKey: vi.fn() };

    beforeEach(async () => {
        vi.clearAllMocks();

        const moduleRef = await Test.createTestingModule({
            controllers: [RequirementsController],
            providers: [{ provide: RequirementsService, useValue: requirementsServiceMock }],
        }).compile();

        controller = moduleRef.get(RequirementsController);
    });

    it('delegates draft requirement creation to the service.', async () => {
        const dto: CreateRequirementDto = {
            kind: RequirementType.NFR,
            categoryId: requirement.categoryId,
            description: requirement.description,
            priority: requirement.priority,
            rationale: requirement.rationale,
            source: requirement.source,
        };

        requirementsServiceMock.create.mockResolvedValue(requirement);

        await expect(controller.create(dto)).resolves.toEqual(requirement);

        expect(requirementsServiceMock.create).toHaveBeenCalledWith(dto);
    });

    it('returns all requirements from the service.', async () => {
        requirementsServiceMock.findAll.mockResolvedValue([requirement]);

        await expect(controller.findAll()).resolves.toEqual([requirement]);

        expect(requirementsServiceMock.findAll).toHaveBeenCalledOnce();
    });

    it('retrieves a requirement by internal ID.', async () => {
        requirementsServiceMock.findOne.mockResolvedValue(requirement);

        await expect(controller.findOne(requirement.id)).resolves.toEqual(requirement);

        expect(requirementsServiceMock.findOne).toHaveBeenCalledWith(requirement.id);
    });

    it('retrieves a requirement by visible key.', async () => {
        requirementsServiceMock.findByVisibleKey.mockResolvedValue(requirement);

        await expect(controller.findByVisibleKey(requirement.visibleKey)).resolves.toEqual(requirement);

        expect(requirementsServiceMock.findByVisibleKey).toHaveBeenCalledWith(requirement.visibleKey);
    });

    it('propagates errors from the service.', async () => {
        const error = new NotFoundException('Requirement was not found');

        requirementsServiceMock.findOne.mockRejectedValue(error);

        await expect(controller.findOne('unknown-id')).rejects.toBe(error);
    });
});
