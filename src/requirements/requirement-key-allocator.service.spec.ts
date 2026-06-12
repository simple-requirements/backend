import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource, EntityManager } from 'typeorm';

import { Category } from '@/categories/category.entity';
import { RequirementKeyAllocatorService } from '@/requirements/requirement-key-allocator.service';
import { RequirementKeyCounter } from '@/requirements/requirement-key-counter.entity';
import { RequirementKind } from '@/requirements/requirement-kind.enum';
import { Requirement } from '@/requirements/requirement.entity';

const category: Category = {
    id: '57eb6e68-1b15-48ea-b976-8fbdb2bfc802',
    name: 'Authentication',
    key: 'AUTH',
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
    service: RequirementKeyAllocatorService;
    manager: ManagerMock;
    insertBuilder: InsertBuilderMock;
    counters: Map<string, RequirementKeyCounter>;
} {
    const counters = new Map<string, RequirementKeyCounter>();
    const requirements: Requirement[] = [];
    const initialNextNumbers = options.initialNextNumbers ?? {};
    const findCategory = options.findCategory === undefined ? category : options.findCategory;

    for (const [key, nextNumber] of Object.entries(initialNextNumbers)) {
        const [kind, categoryId] = key.split(':') as [RequirementKind, string];
        counters.set(key, { id: `counter-${key}`, kind, categoryId, category, nextNumber });
    }

    let pendingCounter: Pick<RequirementKeyCounter, 'kind' | 'categoryId' | 'nextNumber'> | undefined;
    const insertBuilder = createInsertBuilder(() => {
        if (pendingCounter === undefined) {
            return;
        }

        const key = `${pendingCounter.kind}:${pendingCounter.categoryId}`;

        if (!counters.has(key)) {
            counters.set(key, {
                id: `counter-${key}`,
                kind: pendingCounter.kind,
                categoryId: pendingCounter.categoryId,
                category,
                nextNumber: pendingCounter.nextNumber,
            });
        }
    });

    insertBuilder.values.mockImplementation(
        (value: Pick<RequirementKeyCounter, 'kind' | 'categoryId' | 'nextNumber'>) => {
            pendingCounter = value;

            return insertBuilder;
        },
    );

    const manager: ManagerMock = {
        createQueryBuilder: vi.fn(() => insertBuilder) as unknown as ManagerMock['createQueryBuilder'],
        findOne: vi.fn((entity: unknown, options: { where: { kind?: RequirementKind; categoryId?: string } }) => {
            if (entity === Category) {
                return Promise.resolve(findCategory);
            }

            if (entity === RequirementKeyCounter) {
                return Promise.resolve(counters.get(`${options.where.kind}:${options.where.categoryId}`) ?? null);
            }

            return Promise.resolve(null);
        }) as unknown as ManagerMock['findOne'],
        create: vi.fn((_entity: unknown, value: Requirement) => value) as unknown as ManagerMock['create'],
        save: vi.fn((entity: unknown, value: Requirement | RequirementKeyCounter) => {
            if (entity === RequirementKeyCounter) {
                const counter = value as RequirementKeyCounter;
                counters.set(`${counter.kind}:${counter.categoryId}`, counter);

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

    return { service: new RequirementKeyAllocatorService(dataSource), manager, insertBuilder, counters };
}

describe('RequirementKeyAllocatorService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('allocates sequential visible keys for the same kind and category', async () => {
        const { service } = createService();

        await expect(service.allocate(RequirementKind.FR, category.id)).resolves.toEqual({
            id: 'requirement-0',
            kind: RequirementKind.FR,
            categoryId: category.id,
            sequenceNumber: 0,
            visibleKey: 'FR-AUTH-0000',
        });

        await expect(service.allocate(RequirementKind.FR, category.id)).resolves.toEqual({
            id: 'requirement-1',
            kind: RequirementKind.FR,
            categoryId: category.id,
            sequenceNumber: 1,
            visibleKey: 'FR-AUTH-0001',
        });
    });

    it('scopes numbering by kind and category', async () => {
        const { service } = createService();

        await service.allocate(RequirementKind.FR, category.id);

        await expect(service.allocate(RequirementKind.NFR, category.id)).resolves.toEqual({
            id: 'requirement-1',
            kind: RequirementKind.NFR,
            categoryId: category.id,
            sequenceNumber: 0,
            visibleKey: 'NFR-AUTH-0000',
        });
    });

    it('does not create duplicate visible keys during concurrent allocation attempts', async () => {
        const { service } = createService();

        const allocations = await Promise.all([
            service.allocate(RequirementKind.FR, category.id),
            service.allocate(RequirementKind.FR, category.id),
            service.allocate(RequirementKind.NFR, category.id),
        ]);

        expect(allocations.map((allocation) => allocation.visibleKey)).toEqual([
            'FR-AUTH-0000',
            'FR-AUTH-0001',
            'NFR-AUTH-0000',
        ]);
        expect(new Set(allocations.map((allocation) => allocation.visibleKey)).size).toBe(allocations.length);
    });

    it('locks the durable counter row before consuming the next number', async () => {
        const { service, manager } = createService();

        await service.allocate(RequirementKind.FR, category.id);

        expect(manager.findOne).toHaveBeenCalledWith(RequirementKeyCounter, {
            where: { kind: RequirementKind.FR, categoryId: category.id },
            lock: { mode: 'pessimistic_write' },
        });
    });

    it('rejects allocation when the sequence range is exhausted', async () => {
        const { service } = createService({ initialNextNumbers: { [`${RequirementKind.FR}:${category.id}`]: 10_000 } });

        await expect(service.allocate(RequirementKind.FR, category.id)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects unsupported requirement kinds', async () => {
        const { service } = createService();

        await expect(service.allocate('BUG' as RequirementKind, category.id)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('rejects unknown categories', async () => {
        const { service } = createService({ findCategory: null });

        await expect(service.allocate(RequirementKind.FR, category.id)).rejects.toBeInstanceOf(NotFoundException);
    });
});
