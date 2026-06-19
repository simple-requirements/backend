import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Project } from '@/projects/project.entity';
import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { UpdateRequirementDto } from '@/requirements/dto/update-requirement.dto';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { Requirement } from '@/requirements/requirements.entity';
import { RequirementsService } from '@/requirements/requirements.service';

const fixedDate = new Date('2026-06-12T00:00:00.000Z');

const createProjectFixture = (overrides: Partial<Project> = {}): Project => ({
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Requirements Platform',
    createdAt: fixedDate,
    updatedAt: fixedDate,
    ...overrides,
});

const createRequirementFixture = (overrides: Partial<Requirement> = {}): Requirement => {
    const project = overrides.project ?? createProjectFixture();

    return {
        id: 'adf3f623-ef79-49f9-8148-2b43efe903bb',
        type: RequirementType.NFR,
        projectId: project.id,
        categoryId: '57eb6e68-1b15-48ea-b976-8fbdb2bfc802',
        sequenceNumber: 1,
        visibleKey: 'NFR-PERF-0001',
        status: RequirementStatus.Draft,
        description: 'The API responds quickly.',
        priority: 'p1',
        owner: 'Team A',
        rationale: 'Latency impacts users.',
        source: 'US-REQ-001',
        rejectionReason: null,
        reviewer: null,
        rejectedAt: null,
        deletedAt: null,
        approvedAt: null,
        implementedAt: null,
        obsolescenceReason: null,
        obsoleteAt: null,
        createdAt: fixedDate,
        updatedAt: fixedDate,
        category: {
            id: '57eb6e68-1b15-48ea-b976-8fbdb2bfc802',
            name: 'Performance',
            key: 'PERF',
            createdAt: fixedDate,
            updatedAt: fixedDate,
            type: RequirementType.NFR,
        },
        project,
        ...overrides,
    };
};

const project = createProjectFixture();
const baseRequirement = createRequirementFixture({ project });

const baseRevision: RequirementRevision = {
    id: '31f99575-e1f5-4c1f-a7bb-490f7f1661e4',
    requirementId: baseRequirement.id,
    revisionNumber: 1,
    visibleKey: baseRequirement.visibleKey,
    type: baseRequirement.type,
    projectId: baseRequirement.projectId,
    categoryId: baseRequirement.categoryId,
    sequenceNumber: baseRequirement.sequenceNumber,
    status: baseRequirement.status,
    description: baseRequirement.description,
    priority: baseRequirement.priority,
    owner: baseRequirement.owner,
    rationale: baseRequirement.rationale,
    source: baseRequirement.source,
    rejectionReason: baseRequirement.rejectionReason,
    reviewer: baseRequirement.reviewer,
    rejectedAt: baseRequirement.rejectedAt,
    deletedAt: baseRequirement.deletedAt,
    approvedAt: baseRequirement.approvedAt,
    implementedAt: baseRequirement.implementedAt,
    obsolescenceReason: baseRequirement.obsolescenceReason,
    obsoleteAt: baseRequirement.obsoleteAt,
    requirementCreatedAt: baseRequirement.createdAt,
    requirementUpdatedAt: baseRequirement.updatedAt,
    createdAt: new Date('2026-06-12T00:00:02.000Z'),
    requirement: baseRequirement,
};

describe('RequirementsService', () => {
    let service: RequirementsService;

    const requirementsRepositoryMock = { find: vi.fn(), findOne: vi.fn(), save: vi.fn() };
    const requirementRevisionsRepositoryMock = { find: vi.fn(), findOne: vi.fn() };
    const projectsRepositoryMock = { findOne: vi.fn() };
    const requirementsKeyAllocatorServiceMock = {
        allocateInTransaction: vi.fn(),
        runWithAllocationConflictMapping: vi.fn(),
    };
    const transactionManagerMock = { findOne: vi.fn(), create: vi.fn(), save: vi.fn() };
    const dataSourceMock = { transaction: vi.fn() };

    beforeEach(async () => {
        vi.clearAllMocks();
        dataSourceMock.transaction.mockImplementation((callback: (manager: typeof transactionManagerMock) => unknown) =>
            Promise.resolve(callback(transactionManagerMock)),
        );
        transactionManagerMock.create.mockImplementation((_entity: unknown, value: unknown) => value);
        projectsRepositoryMock.findOne.mockResolvedValue(project);
        requirementsKeyAllocatorServiceMock.runWithAllocationConflictMapping.mockImplementation(
            (operation: () => Promise<unknown>) => operation(),
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequirementsService,
                { provide: getRepositoryToken(Requirement), useValue: requirementsRepositoryMock },
                { provide: getRepositoryToken(RequirementRevision), useValue: requirementRevisionsRepositoryMock },
                { provide: getRepositoryToken(Project), useValue: projectsRepositoryMock },
                { provide: getDataSourceToken(), useValue: dataSourceMock },
                { provide: RequirementsKeyAllocatorService, useValue: requirementsKeyAllocatorServiceMock },
            ],
        }).compile();

        service = module.get<RequirementsService>(RequirementsService);
    });

    it('builds requirement fixtures with matching project ownership.', () => {
        const requirement = createRequirementFixture();

        expect(requirement.projectId).toBe(requirement.project.id);
        expect(requirement.projectId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
    });

    it('creates a draft requirement with an allocated visible key.', async () => {
        const dto: CreateRequirementDto = {
            projectId: baseRequirement.projectId,
            categoryId: baseRequirement.categoryId,
            description: ' The API responds quickly. ',
            priority: ' p1 ',
            owner: ' ',
            rationale: ' Latency impacts users. ',
            source: ' US-REQ-001 ',
        };

        requirementsKeyAllocatorServiceMock.allocateInTransaction.mockResolvedValue({
            id: baseRequirement.id,
            type: baseRequirement.type,
            categoryId: baseRequirement.categoryId,
            sequenceNumber: baseRequirement.sequenceNumber,
            visibleKey: baseRequirement.visibleKey,
        });
        transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, description: null, priority: null });
        transactionManagerMock.save.mockImplementation((_entity: unknown, requirement: Requirement) =>
            Promise.resolve({ ...requirement, updatedAt: new Date('2026-06-12T00:00:01.000Z') }),
        );

        await expect(service.create(dto)).resolves.toEqual({
            id: baseRequirement.id,
            visibleKey: baseRequirement.visibleKey,
            type: RequirementType.NFR,
            projectId: baseRequirement.projectId,
            categoryId: baseRequirement.categoryId,
            sequenceNumber: 1,
            status: RequirementStatus.Draft,
            description: 'The API responds quickly.',
            priority: 'p1',
            owner: null,
            rationale: 'Latency impacts users.',
            source: 'US-REQ-001',
            rejectionReason: null,
            reviewer: null,
            rejectedAt: null,
            deletedAt: null,
            approvedAt: null,
            implementedAt: null,
            obsolescenceReason: null,
            obsoleteAt: null,
            createdAt: '2026-06-12T00:00:00.000Z',
            updatedAt: '2026-06-12T00:00:01.000Z',
        });

        expect(requirementsKeyAllocatorServiceMock.allocateInTransaction).toHaveBeenCalledWith(
            transactionManagerMock,
            dto.categoryId,
            dto.projectId,
        );
        expect(transactionManagerMock.findOne).toHaveBeenCalledWith(
            Requirement,
            expect.objectContaining({ relations: { category: true, project: true } }),
        );
    });

    it('rejects requirement creation with missing required fields.', async () => {
        await expect(
            service.create({
                categoryId: baseRequirement.categoryId,
                description: 'Description',
                priority: 'p1',
            } as CreateRequirementDto),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementsKeyAllocatorServiceMock.allocateInTransaction).not.toHaveBeenCalled();
    });

    it('rejects requirement priorities outside p1, p2, or p3.', async () => {
        await expect(
            service.create({
                projectId: baseRequirement.projectId,
                categoryId: baseRequirement.categoryId,
                description: 'Description',
                priority: 'high',
            }),
        ).rejects.toThrow('Requirement priority must be p1, p2, or p3');

        await expect(service.update(baseRequirement.id, { priority: 'p4' })).rejects.toThrow(
            'Requirement priority must be p1, p2, or p3',
        );

        expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });

    it('retrieves a requirement by internal ID.', async () => {
        requirementsRepositoryMock.findOne.mockResolvedValue(baseRequirement);

        await expect(service.findOne(baseRequirement.id)).resolves.toEqual(
            expect.objectContaining({ id: baseRequirement.id, visibleKey: baseRequirement.visibleKey }),
        );
    });

    it('retrieves a requirement by visible key.', async () => {
        requirementsRepositoryMock.findOne.mockResolvedValue(baseRequirement);

        await expect(service.findByVisibleKey(baseRequirement.visibleKey)).resolves.toEqual(
            expect.objectContaining({ id: baseRequirement.id, visibleKey: baseRequirement.visibleKey }),
        );
    });

    it.each(['FR-UI-0001', 'FR-AUTH-0001', 'NFR-SEC-0001', 'NFR-PERF-9999'])(
        'accepts valid visible key %s for exact lookup validation.',
        async (visibleKey) => {
            requirementsRepositoryMock.findOne.mockResolvedValue(createRequirementFixture({ visibleKey }));

            await expect(service.findByVisibleKey(visibleKey)).resolves.toEqual(
                expect.objectContaining({ visibleKey }),
            );
        },
    );

    it.each([
        'FR-U-0001',
        'FR-USERIF-0001',
        'FR-ui-0001',
        'FR-UI1-0001',
        'FR-UI_0001',
        'FR-UI-000',
        'FR-UI-10000',
        'REQ-UI-0001',
    ])('rejects malformed visible key %s.', async (visibleKey) => {
        await expect(service.findByVisibleKey(visibleKey)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lists requirements ordered by visible key.', async () => {
        requirementsRepositoryMock.find.mockResolvedValue([baseRequirement]);

        await expect(service.findAll({ projectId: baseRequirement.projectId })).resolves.toEqual([
            expect.objectContaining({ id: baseRequirement.id, visibleKey: baseRequirement.visibleKey }),
        ]);

        expect(requirementsRepositoryMock.find).toHaveBeenCalledWith(
            expect.objectContaining({ order: { visibleKey: 'ASC' } }),
        );
    });

    it('lists rejected requirements only when explicitly requested.', async () => {
        const rejectedRequirement = { ...baseRequirement, status: RequirementStatus.Rejected };
        requirementsRepositoryMock.find.mockResolvedValue([rejectedRequirement]);

        await expect(
            service.findAll({ projectId: baseRequirement.projectId, includeRejected: 'true' }),
        ).resolves.toEqual([expect.objectContaining({ id: baseRequirement.id, status: RequirementStatus.Rejected })]);

        expect(requirementsRepositoryMock.find).toHaveBeenCalledWith(
            expect.objectContaining({ order: { visibleKey: 'ASC' } }),
        );
    });

    it('lists obsolete requirements only when explicitly requested.', async () => {
        const obsoleteRequirement = { ...baseRequirement, status: RequirementStatus.Obsolete };
        requirementsRepositoryMock.find.mockResolvedValue([obsoleteRequirement]);

        await expect(
            service.findAll({ projectId: baseRequirement.projectId, status: RequirementStatus.Obsolete }),
        ).resolves.toEqual([expect.objectContaining({ id: baseRequirement.id, status: RequirementStatus.Obsolete })]);

        expect(requirementsRepositoryMock.find).toHaveBeenCalledWith(
            expect.objectContaining({ order: { visibleKey: 'ASC' } }),
        );
    });

    it('throws not found when a requirement cannot be retrieved.', async () => {
        requirementsRepositoryMock.findOne.mockResolvedValue(null);

        await expect(service.findOne(baseRequirement.id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates editable requirement fields and stores an immutable previous-version snapshot.', async () => {
        const updateDto: UpdateRequirementDto = {
            description: ' Updated description. ',
            owner: ' Team B ',
            rationale: ' Updated rationale. ',
            source: ' US-REQ-005 ',
        };
        const currentRequirement = { ...baseRequirement };

        transactionManagerMock.findOne.mockResolvedValueOnce(currentRequirement).mockResolvedValueOnce(null);
        transactionManagerMock.save.mockImplementation((entity: unknown, value: Requirement | RequirementRevision) => {
            if (entity === RequirementRevision) {
                return Promise.resolve({ ...value, id: baseRevision.id, createdAt: baseRevision.createdAt });
            }

            return Promise.resolve({ ...value, updatedAt: new Date('2026-06-12T00:00:03.000Z') });
        });

        await expect(service.update(baseRequirement.id, updateDto)).resolves.toEqual(
            expect.objectContaining({
                id: baseRequirement.id,
                visibleKey: baseRequirement.visibleKey,
                type: baseRequirement.type,
                categoryId: baseRequirement.categoryId,
                sequenceNumber: baseRequirement.sequenceNumber,
                description: 'Updated description.',
                owner: 'Team B',
                rationale: 'Updated rationale.',
                source: 'US-REQ-005',
                projectId: baseRequirement.projectId,
            }),
        );

        expect(transactionManagerMock.save).toHaveBeenCalledWith(
            RequirementRevision,
            expect.objectContaining({
                requirementId: baseRequirement.id,
                revisionNumber: 1,
                visibleKey: baseRequirement.visibleKey,
                type: baseRequirement.type,
                categoryId: baseRequirement.categoryId,
                description: baseRequirement.description,
                owner: baseRequirement.owner,
            }),
        );
    });

    it('rejects updates that try to change immutable requirement identity or classification fields.', async () => {
        const updateDtoWithImmutableType: UpdateRequirementDto & { type: RequirementType } = {
            type: RequirementType.FR,
            description: 'Updated',
        };

        await expect(service.update(baseRequirement.id, updateDtoWithImmutableType)).rejects.toBeInstanceOf(
            BadRequestException,
        );

        expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });

    it('rejects a draft requirement with mandatory reason, reviewer, and server rejection date.', async () => {
        const currentRequirement = { ...baseRequirement };
        const rejectedAt = new Date('2026-06-12T00:00:05.000Z');
        vi.useFakeTimers();
        vi.setSystemTime(rejectedAt);
        transactionManagerMock.findOne.mockResolvedValueOnce(currentRequirement).mockResolvedValueOnce(null);
        transactionManagerMock.save.mockImplementation((entity: unknown, value: Requirement | RequirementRevision) => {
            if (entity === RequirementRevision) {
                return Promise.resolve({ ...value, id: baseRevision.id, createdAt: baseRevision.createdAt });
            }

            return Promise.resolve({ ...value, updatedAt: new Date('2026-06-12T00:00:06.000Z') });
        });

        await expect(
            service.reject(baseRequirement.id, {
                rejectionReason: ' Not testable as written. ',
                reviewer: ' QA Lead ',
            }),
        ).resolves.toEqual(
            expect.objectContaining({
                id: baseRequirement.id,
                status: RequirementStatus.Rejected,
                rejectionReason: 'Not testable as written.',
                reviewer: 'QA Lead',
                rejectedAt: rejectedAt.toISOString(),
            }),
        );

        vi.useRealTimers();
    });

    it('requires a rejection reason and reviewer when rejecting a draft requirement.', async () => {
        await expect(
            service.reject(baseRequirement.id, { rejectionReason: ' ', reviewer: 'QA Lead' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
            service.reject(baseRequirement.id, { rejectionReason: 'Not needed', reviewer: ' ' }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });

    it('soft deletes draft requirements so their visible key stays reserved.', async () => {
        const currentRequirement = { ...baseRequirement };
        const deletedAt = new Date('2026-06-12T00:00:07.000Z');
        vi.useFakeTimers();
        vi.setSystemTime(deletedAt);
        transactionManagerMock.findOne.mockResolvedValueOnce(currentRequirement).mockResolvedValueOnce(null);
        transactionManagerMock.save.mockResolvedValue({
            ...currentRequirement,
            status: RequirementStatus.Deleted,
            deletedAt,
        });

        await expect(service.delete(baseRequirement.id)).resolves.toBeUndefined();

        expect(transactionManagerMock.save).toHaveBeenCalledWith(
            Requirement,
            expect.objectContaining({
                id: baseRequirement.id,
                visibleKey: baseRequirement.visibleKey,
                status: RequirementStatus.Deleted,
                deletedAt,
            }),
        );

        vi.useRealTimers();
    });

    it('rejects deletion of rejected requirements.', async () => {
        transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, status: RequirementStatus.Rejected });

        await expect(service.delete(baseRequirement.id)).rejects.toBeInstanceOf(ConflictException);
    });

    it('transitions draft requirements to approved with a server approval date.', async () => {
        const currentRequirement = { ...baseRequirement };
        const approvedAt = new Date('2026-06-12T00:00:08.000Z');
        vi.useFakeTimers();
        vi.setSystemTime(approvedAt);
        transactionManagerMock.findOne.mockResolvedValueOnce(currentRequirement).mockResolvedValueOnce(null);
        transactionManagerMock.save.mockImplementation((entity: unknown, value: Requirement | RequirementRevision) => {
            if (entity === RequirementRevision) {
                return Promise.resolve({ ...value, id: baseRevision.id, createdAt: baseRevision.createdAt });
            }

            return Promise.resolve({ ...value, updatedAt: new Date('2026-06-12T00:00:09.000Z') });
        });

        await expect(service.approve(baseRequirement.id)).resolves.toEqual(
            expect.objectContaining({
                id: baseRequirement.id,
                status: RequirementStatus.Approved,
                approvedAt: approvedAt.toISOString(),
            }),
        );

        vi.useRealTimers();
    });

    it('transitions approved requirements to implemented with a server implementation date.', async () => {
        const approvedAt = new Date('2026-06-12T00:00:08.000Z');
        const implementedAt = new Date('2026-06-12T00:00:10.000Z');
        const currentRequirement = { ...baseRequirement, status: RequirementStatus.Approved, approvedAt };
        vi.useFakeTimers();
        vi.setSystemTime(implementedAt);
        transactionManagerMock.findOne.mockResolvedValueOnce(currentRequirement).mockResolvedValueOnce(null);
        transactionManagerMock.save.mockImplementation((entity: unknown, value: Requirement | RequirementRevision) => {
            if (entity === RequirementRevision) {
                return Promise.resolve({ ...value, id: baseRevision.id, createdAt: baseRevision.createdAt });
            }

            return Promise.resolve({ ...value, updatedAt: new Date('2026-06-12T00:00:11.000Z') });
        });

        await expect(service.markImplemented(baseRequirement.id)).resolves.toEqual(
            expect.objectContaining({
                id: baseRequirement.id,
                status: RequirementStatus.Implemented,
                approvedAt: approvedAt.toISOString(),
                implementedAt: implementedAt.toISOString(),
            }),
        );

        vi.useRealTimers();
    });

    it.each([RequirementStatus.Approved, RequirementStatus.Rejected])(
        'marks %s requirements obsolete with a mandatory reason and server date.',
        async (status) => {
            const obsoleteAt = new Date('2026-06-12T00:00:12.000Z');
            const currentRequirement = { ...baseRequirement, status };
            vi.useFakeTimers();
            vi.setSystemTime(obsoleteAt);
            transactionManagerMock.findOne.mockResolvedValueOnce(currentRequirement).mockResolvedValueOnce(null);
            transactionManagerMock.save.mockImplementation(
                (entity: unknown, value: Requirement | RequirementRevision) => {
                    if (entity === RequirementRevision) {
                        return Promise.resolve({ ...value, id: baseRevision.id, createdAt: baseRevision.createdAt });
                    }

                    return Promise.resolve({ ...value, updatedAt: new Date('2026-06-12T00:00:13.000Z') });
                },
            );

            await expect(
                service.markObsolete(baseRequirement.id, { obsolescenceReason: ' Superseded by NFR-PERF-0002. ' }),
            ).resolves.toEqual(
                expect.objectContaining({
                    id: baseRequirement.id,
                    status: RequirementStatus.Obsolete,
                    obsolescenceReason: 'Superseded by NFR-PERF-0002.',
                    obsoleteAt: obsoleteAt.toISOString(),
                }),
            );

            vi.useRealTimers();
        },
    );

    it('rejects invalid lifecycle transitions with meaningful conflicts.', async () => {
        transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, status: RequirementStatus.Draft });

        await expect(service.markImplemented(baseRequirement.id)).rejects.toThrow(
            'Only approved requirements can be marked implemented',
        );
        await expect(
            service.markObsolete(baseRequirement.id, { obsolescenceReason: 'No longer needed.' }),
        ).rejects.toThrow('Only approved or rejected requirements can be marked obsolete');
    });

    it('rejects obsolete transitions from implemented requirements.', async () => {
        transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, status: RequirementStatus.Implemented });

        await expect(
            service.markObsolete(baseRequirement.id, { obsolescenceReason: 'No longer needed.' }),
        ).rejects.toThrow('Only approved or rejected requirements can be marked obsolete');
    });

    it('requires an obsolescence reason before opening an obsolete transition transaction.', async () => {
        await expect(service.markObsolete(baseRequirement.id, { obsolescenceReason: ' ' })).rejects.toBeInstanceOf(
            BadRequestException,
        );

        expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });

    it.each([RequirementStatus.Approved, RequirementStatus.Implemented, RequirementStatus.Obsolete])(
        'rejects deletion of %s requirements.',
        async (status) => {
            transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, status });

            await expect(service.delete(baseRequirement.id)).rejects.toBeInstanceOf(ConflictException);
        },
    );

    it.each([RequirementStatus.Approved, RequirementStatus.Rejected, RequirementStatus.Implemented])(
        'prevents %s requirements from returning to draft through the generic update path.',
        async () => {
            const updateDtoWithImmutableStatus: UpdateRequirementDto & { status: RequirementStatus } = {
                status: RequirementStatus.Draft,
                description: 'Back to draft.',
            };

            await expect(service.update(baseRequirement.id, updateDtoWithImmutableStatus)).rejects.toBeInstanceOf(
                BadRequestException,
            );

            expect(dataSourceMock.transaction).not.toHaveBeenCalled();
        },
    );

    it('rejects approved requirements being rejected or deleted.', async () => {
        transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, status: RequirementStatus.Approved });

        await expect(
            service.reject(baseRequirement.id, { rejectionReason: 'No longer wanted.', reviewer: 'QA Lead' }),
        ).rejects.toThrow('Only draft requirements can be rejected');
        await expect(service.delete(baseRequirement.id)).rejects.toThrow('Only draft requirements can be deleted');
    });

    it('rejects rejected requirements being approved or deleted.', async () => {
        transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, status: RequirementStatus.Rejected });

        await expect(service.approve(baseRequirement.id)).rejects.toThrow('Only draft requirements can be approved');
        await expect(service.delete(baseRequirement.id)).rejects.toThrow('Only draft requirements can be deleted');
    });

    it('treats implemented requirements as terminal for every lifecycle transition.', async () => {
        transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, status: RequirementStatus.Implemented });

        await expect(service.approve(baseRequirement.id)).rejects.toThrow('Only draft requirements can be approved');
        await expect(
            service.reject(baseRequirement.id, { rejectionReason: 'No longer wanted.', reviewer: 'QA Lead' }),
        ).rejects.toThrow('Only draft requirements can be rejected');
        await expect(service.markImplemented(baseRequirement.id)).rejects.toThrow(
            'Only approved requirements can be marked implemented',
        );
        await expect(
            service.markObsolete(baseRequirement.id, { obsolescenceReason: 'No longer needed.' }),
        ).rejects.toThrow('Only approved or rejected requirements can be marked obsolete');
        await expect(service.delete(baseRequirement.id)).rejects.toThrow('Only draft requirements can be deleted');
    });

    it('treats obsolete requirements as terminal for every lifecycle transition.', async () => {
        transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, status: RequirementStatus.Obsolete });

        await expect(service.approve(baseRequirement.id)).rejects.toThrow('Only draft requirements can be approved');
        await expect(
            service.reject(baseRequirement.id, { rejectionReason: 'No longer wanted.', reviewer: 'QA Lead' }),
        ).rejects.toThrow('Only draft requirements can be rejected');
        await expect(service.markImplemented(baseRequirement.id)).rejects.toThrow(
            'Only approved requirements can be marked implemented',
        );
        await expect(
            service.markObsolete(baseRequirement.id, { obsolescenceReason: 'No longer needed.' }),
        ).rejects.toThrow('Only approved or rejected requirements can be marked obsolete');
        await expect(service.delete(baseRequirement.id)).rejects.toThrow('Only draft requirements can be deleted');
    });

    it('treats deleted requirements as unavailable for normal lookup and lifecycle transitions.', async () => {
        requirementsRepositoryMock.findOne.mockResolvedValue(null);
        await expect(service.findOne(baseRequirement.id)).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.findByVisibleKey(baseRequirement.visibleKey)).rejects.toBeInstanceOf(NotFoundException);

        transactionManagerMock.findOne.mockResolvedValue({ ...baseRequirement, status: RequirementStatus.Deleted });
        await expect(service.approve(baseRequirement.id)).rejects.toBeInstanceOf(NotFoundException);
        await expect(
            service.reject(baseRequirement.id, { rejectionReason: 'No longer wanted.', reviewer: 'QA Lead' }),
        ).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.markImplemented(baseRequirement.id)).rejects.toBeInstanceOf(NotFoundException);
        await expect(
            service.markObsolete(baseRequirement.id, { obsolescenceReason: 'No longer needed.' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns requirement revision history.', async () => {
        requirementsRepositoryMock.findOne.mockResolvedValue(baseRequirement);
        requirementRevisionsRepositoryMock.find.mockResolvedValue([baseRevision]);

        await expect(service.findRevisionHistory(baseRequirement.id)).resolves.toEqual([
            expect.objectContaining({
                requirementId: baseRequirement.id,
                revisionNumber: 1,
                visibleKey: baseRequirement.visibleKey,
                description: baseRequirement.description,
            }),
        ]);
    });

    it('retrieves a previous requirement version by revision number.', async () => {
        requirementsRepositoryMock.findOne.mockResolvedValue(baseRequirement);
        requirementRevisionsRepositoryMock.findOne.mockResolvedValue(baseRevision);

        await expect(service.findRevision(baseRequirement.id, 1)).resolves.toEqual(
            expect.objectContaining({ requirementId: baseRequirement.id, revisionNumber: 1 }),
        );
    });
});
