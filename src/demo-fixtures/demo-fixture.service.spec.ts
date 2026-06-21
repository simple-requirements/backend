import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DemoFixtureService } from './demo-fixture.service';
import {
    DEMO_FIXTURE_CATEGORIES,
    DEMO_FIXTURE_PROJECTS,
    DEMO_FIXTURE_REQUIREMENTS,
    DEMO_FIXTURE_RESET_ENV,
} from './demo-workspace.fixture';

const repository = () => ({
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    save: vi.fn((value: Record<string, unknown>) =>
        Promise.resolve({ id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...value }),
    ),
    create: vi.fn((value: Record<string, unknown>) => value),
    delete: vi.fn().mockResolvedValue({ affected: 0 }),
    createQueryBuilder: vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(0),
    })),
});

function createService(overrides: Partial<Record<string, ReturnType<typeof repository>>> = {}): DemoFixtureService {
    const repos = { projects: repository(), categories: repository(), ...overrides };
    const dataSource = { transaction: vi.fn() };
    return new DemoFixtureService(repos.projects as never, repos.categories as never, dataSource as never);
}

describe('DemoFixtureService', () => {
    it('validates the recovered frontend manifest counts and deterministic ordering.', () => {
        expect(DEMO_FIXTURE_PROJECTS).toHaveLength(8);
        expect(DEMO_FIXTURE_CATEGORIES.map((category) => category.key)).toEqual([
            'AUTH',
            'DATA',
            'UI',
            'INT',
            'PERF',
            'SEC',
            'USAB',
        ]);
        expect(DEMO_FIXTURE_REQUIREMENTS).toHaveLength(151);
        expect(DEMO_FIXTURE_REQUIREMENTS[0]).toMatchObject({
            legacyId: 'project-alpha-req-1',
            visibleKey: 'FR-DATA-0001',
            status: RequirementStatus.Approved,
        });
        expect(() => createService().validateManifest()).not.toThrow();
    });

    it('enforces the explicit reset safety guard.', () => {
        expect(() => createService().assertResetAllowed({})).toThrow(BadRequestException);
        expect(() => createService().assertResetAllowed({ [DEMO_FIXTURE_RESET_ENV]: 'true' })).not.toThrow();
    });

    it('detects existing demo projects before seed to avoid duplicates.', async () => {
        const projects = repository();
        projects.find.mockResolvedValue([{ id: crypto.randomUUID(), name: DEMO_FIXTURE_PROJECTS[0].name }]);
        await expect(createService({ projects }).seed()).rejects.toThrow(ConflictException);
    });

    it('reuses compatible categories and rejects incompatible category duplicates.', async () => {
        const categories = repository();
        categories.findOne.mockResolvedValueOnce({
            id: crypto.randomUUID(),
            key: 'AUTH',
            name: 'Different',
            type: 'FR',
        });
        await expect(
            (
                createService({ categories }) as unknown as {
                    ensureCategories(manager: { findOne: typeof categories.findOne }): Promise<void>;
                }
            ).ensureCategories({ findOne: categories.findOne }),
        ).rejects.toThrow(ConflictException);
    });
});
