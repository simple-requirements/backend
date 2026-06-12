import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import type { RequirementRevisionResponseDto } from '@/requirements/dto/requirement-revision-response.dto';
import type { UpdateRequirementDto } from '@/requirements/dto/update-requirement.dto';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsController } from '@/requirements/requirements.controller';
import { RequirementsService } from '@/requirements/requirements.service';

describe('RequirementsController', () => {
    let controller: RequirementsController;

    const requirement: RequirementResponseDto = {
        id: 'adf3f623-ef79-49f9-8148-2b43efe903bb',
        visibleKey: 'NFR-PERF-0001',
        type: RequirementType.NFR,
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

    const revision: RequirementRevisionResponseDto = {
        id: '31f99575-e1f5-4c1f-a7bb-490f7f1661e4',
        requirementId: requirement.id,
        revisionNumber: 1,
        visibleKey: requirement.visibleKey,
        type: requirement.type,
        categoryId: requirement.categoryId,
        sequenceNumber: requirement.sequenceNumber,
        status: requirement.status,
        description: requirement.description,
        priority: requirement.priority,
        owner: requirement.owner,
        rationale: requirement.rationale,
        source: requirement.source,
        rejectionReason: requirement.rejectionReason,
        reviewer: requirement.reviewer,
        rejectedAt: requirement.rejectedAt,
        deletedAt: requirement.deletedAt,
        requirementCreatedAt: requirement.createdAt,
        requirementUpdatedAt: requirement.updatedAt,
        createdAt: '2026-06-12T00:00:01.000Z',
    };

    const requirementsServiceMock = {
        create: vi.fn(),
        findAll: vi.fn(),
        findOne: vi.fn(),
        findByVisibleKey: vi.fn(),
        update: vi.fn(),
        findRevisionHistory: vi.fn(),
        findRevision: vi.fn(),
        reject: vi.fn(),
        delete: vi.fn(),
    };

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
            type: RequirementType.NFR,
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

        expect(requirementsServiceMock.findAll).toHaveBeenCalledWith(undefined);
    });

    it('includes rejected requirements when requested.', async () => {
        requirementsServiceMock.findAll.mockResolvedValue([{ ...requirement, status: RequirementStatus.Rejected }]);

        await expect(controller.findAll({ includeRejected: 'true' })).resolves.toEqual([
            { ...requirement, status: RequirementStatus.Rejected },
        ]);

        expect(requirementsServiceMock.findAll).toHaveBeenCalledWith({ includeRejected: 'true' });
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

    it('delegates draft requirement updates to the service.', async () => {
        const dto: UpdateRequirementDto = { owner: 'Team B', rationale: 'Updated rationale' };
        const updated = { ...requirement, owner: 'Team B', rationale: 'Updated rationale' };
        requirementsServiceMock.update.mockResolvedValue(updated);

        await expect(controller.update(requirement.id, dto)).resolves.toEqual(updated);

        expect(requirementsServiceMock.update).toHaveBeenCalledWith(requirement.id, dto);
    });

    it('delegates draft requirement rejection to the service.', async () => {
        const dto = { rejectionReason: 'Not aligned', reviewer: 'Reviewer A' };
        const rejected = {
            ...requirement,
            status: RequirementStatus.Rejected,
            rejectionReason: 'Not aligned',
            reviewer: 'Reviewer A',
            rejectedAt: '2026-06-12T00:00:02.000Z',
        };
        requirementsServiceMock.reject.mockResolvedValue(rejected);

        await expect(controller.reject(requirement.id, dto)).resolves.toEqual(rejected);

        expect(requirementsServiceMock.reject).toHaveBeenCalledWith(requirement.id, dto);
    });

    it('delegates draft requirement deletion to the service.', async () => {
        requirementsServiceMock.delete.mockResolvedValue(undefined);

        await expect(controller.delete(requirement.id)).resolves.toBeUndefined();

        expect(requirementsServiceMock.delete).toHaveBeenCalledWith(requirement.id);
    });

    it('retrieves requirement revision history.', async () => {
        requirementsServiceMock.findRevisionHistory.mockResolvedValue([revision]);

        await expect(controller.findRevisionHistory(requirement.id)).resolves.toEqual([revision]);

        expect(requirementsServiceMock.findRevisionHistory).toHaveBeenCalledWith(requirement.id);
    });

    it('retrieves a previous requirement version.', async () => {
        requirementsServiceMock.findRevision.mockResolvedValue(revision);

        await expect(controller.findRevision(requirement.id, 1)).resolves.toEqual(revision);

        expect(requirementsServiceMock.findRevision).toHaveBeenCalledWith(requirement.id, 1);
    });

    it('propagates errors from the service.', async () => {
        const error = new NotFoundException('Requirement was not found');

        requirementsServiceMock.findOne.mockRejectedValue(error);

        await expect(controller.findOne('unknown-id')).rejects.toBe(error);
    });
});
