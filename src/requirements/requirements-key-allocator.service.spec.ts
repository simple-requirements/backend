import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource, EntityManager } from 'typeorm';

import { Category } from '@/categories/category.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { RequirementsKeyCounter } from '@/requirements/requirements-key-counter.entity';

const category: Category = {
    id: '57eb6e68-1b15-48ea-b976-8fbdb2bfc802',
    name: 'Performance',
    key: 'PERF',
    createdAt: new Date('2026-06-12T00:00:00.000Z'),
    updatedAt: new Date('2026-06-12T00:00:00.000Z'),
};

type InsertBuilderMock = {
    insert: ReturnType<typeof vi.fn>;
    into: ReturnType<typeof vi.fn>;
    values: ReturnType<typeof vi.fn>;
    orIgnore: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
};

type ManagerMock = Pick<EntityManager, 'create' | 'createQueryBuilder' | 'findOne' | 'save'>;

function createInsertBuilder(onExecute: () => void): InsertBuilderMock {
    const builder = {
        insert: vi.fn(),
        into: vi.fn(),
        values: vi.fn(),
        orIgnore: vi.fn(),
        execute: vi.fn(() => Promise.resolve(onExecute())),
    };

    builder.insert.mockReturnValue(builder);
    builder.into.mockReturnValue(builder);
    builder.values.mockReturnValue(builder);
    builder.orIgnore.mockReturnValue(builder);

    return builder;
}

function createService(options: { initialNextNumbers?: Record<string, number>; findCategory?: Category | null } = {}): {
    service: RequirementsKeyAllocatorService;
    manager: ManagerMock;
    insertBuilder: InsertBuilderMock;
    counters: Map<string, RequirementsKeyCounter>;
} {
    const counters = new Map<string, RequirementsKeyCounter>();
    const requirements: Requirement[] = [];
    const initialNextNumbers = options.initialNextNumbers ?? {};
    const findCategory = options.findCategory === undefined ? category : options.findCategory;

    for (const [key, nextNumber] of Object.entries(initialNextNumbers)) {
        const [type, categoryId] = key.split(':') as [RequirementType, string];
        counters.set(key, { id: `counter-${key}`, type, categoryId, category, nextNumber });
    }

    let pendingCounter: Pick<RequirementsKeyCounter, 'type' | 'categoryId' | 'nextNumber'> | undefined;
    const insertBuilder = createInsertBuilder(() => {
        if (pendingCounter === undefined) {
            return;
        }

        const key = `${pendingCounter.type}:${pendingCounter.categoryId}`;

        if (!counters.has(key)) {
            counters.set(key, {
                id: `counter-${key}`,
                type: pendingCounter.type,
                categoryId: pendingCounter.categoryId,
                category,
                nextNumber: pendingCounter.nextNumber,
            });
        }
    });

    insertBuilder.values.mockImplementation(
        (value: Pick<RequirementsKeyCounter, 'type' | 'categoryId' | 'nextNumber'>) => {
            pendingCounter = value;

            return insertBuilder;
        },
    );

    const manager: ManagerMock = {
        createQueryBuilder: vi.fn(() => insertBuilder) as unknown as ManagerMock['createQueryBuilder'],
        findOne: vi.fn((entity: unknown, options: { where: { type?: RequirementType; categoryId?: string } }) => {
            if (entity === Category) {
                return Promise.resolve(findCategory);
            }

            if (entity === RequirementsKeyCounter) {
                return Promise.resolve(counters.get(`${options.where.type}:${options.where.categoryId}`) ?? null);
            }

            return Promise.resolve(null);
        }) as unknown as ManagerMock['findOne'],
        create: vi.fn((_entity: unknown, value: Requirement) => value) as unknown as ManagerMock['create'],
        save: vi.fn((entity: unknown, value: Requirement | RequirementsKeyCounter) => {
            if (entity === RequirementsKeyCounter) {
                const counter = value as RequirementsKeyCounter;
                counters.set(`${counter.type}:${counter.categoryId}`, counter);

                return Promise.resolve(counter);
            }

            const requirement = value as Requirement;
            const savedRequirement = { ...requirement, id: `requirement-${requirements.length}` };
            requirements.push(savedRequirement);

            return Promise.resolve(savedRequirement);
        }) as unknown as ManagerMock['save'],
    };

    const dataSource = {
        transaction: vi.fn(async (callback: (entityManager: EntityManager) => Promise<unknown>) =>
            callback(manager as EntityManager),
        ),
    } as unknown as DataSource;

    return { service: new RequirementsKeyAllocatorService(dataSource), manager, insertBuilder, counters };
}

describe('RequirementsKeyAllocatorService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('allocates sequential visible keys for the same type and category.', async () => {
        const { service } = createService();

        await expect(service.allocate(RequirementType.NFR, category.id)).resolves.toEqual({
            id: 'requirement-0',
            type: RequirementType.NFR,
            categoryId: category.id,
            sequenceNumber: 1,
            visibleKey: 'NFR-PERF-0001',
        });

        await expect(service.allocate(RequirementType.NFR, category.id)).resolves.toEqual({
            id: 'requirement-1',
            type: RequirementType.NFR,
            categoryId: category.id,
            sequenceNumber: 2,
            visibleKey: 'NFR-PERF-0002',
        });
    });

    it('scopes numbering by type and category.', async () => {
        const { service } = createService();

        await service.allocate(RequirementType.NFR, category.id);

        await expect(service.allocate(RequirementType.NFR, category.id)).resolves.toEqual({
            id: 'requirement-1',
            type: RequirementType.NFR,
            categoryId: category.id,
            sequenceNumber: 2,
            visibleKey: 'NFR-PERF-0002',
        });
    });

    it('does not create duplicate visible keys during concurrent allocation attempts.', async () => {
        const { service } = createService();

        const allocations = await Promise.all([
            service.allocate(RequirementType.NFR, category.id),
            service.allocate(RequirementType.NFR, category.id),
            service.allocate(RequirementType.NFR, category.id),
        ]);

        expect(allocations.map((allocation) => allocation.visibleKey)).toEqual([
            'NFR-PERF-0001',
            'NFR-PERF-0002',
            'NFR-PERF-0003',
        ]);
        expect(new Set(allocations.map((allocation) => allocation.visibleKey)).size).toBe(allocations.length);
    });

    it('locks the durable counter row before consuming the next number.', async () => {
        const { service, manager } = createService();

        await service.allocate(RequirementType.FR, category.id);

        expect(manager.findOne).toHaveBeenCalledWith(RequirementsKeyCounter, {
            where: { type: RequirementType.FR, categoryId: category.id },
            lock: { mode: 'pessimistic_write' },
        });
    });

    it('rejects allocation when the sequence range is exhausted.', async () => {
        const { service } = createService({ initialNextNumbers: { [`${RequirementType.FR}:${category.id}`]: 10_000 } });

        await expect(service.allocate(RequirementType.FR, category.id)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects unsupported requirement types.', async () => {
        const { service } = createService();

        await expect(service.allocate('BUG' as RequirementType, category.id)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('rejects unknown categories.', async () => {
        const { service } = createService({ findCategory: null });

        await expect(service.allocate(RequirementType.FR, category.id)).rejects.toBeInstanceOf(NotFoundException);
    });
});
