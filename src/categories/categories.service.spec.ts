import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { RequirementType } from '@/requirements/requirement-type-enum';
import { CategoriesService } from '@/categories/categories.service';
import { Category } from '@/categories/category.entity';
import { DeepPartial, FindManyOptions, FindOneOptions } from 'typeorm';

type CategoryRepositoryMock = {
    create: Mock<(entityLike: DeepPartial<Category>) => Category>;

    find: Mock<(options?: FindManyOptions<Category>) => Promise<Category[]>>;

    findOne: Mock<(options: FindOneOptions<Category>) => Promise<Category | null>>;

    save: Mock<(category: Category) => Promise<Category>>;
};

const now = new Date('2026-06-07T00:00:00.000Z');

function createCategory(overrides: Partial<Category> = {}): Category {
    return {
        id: '0f25fbce-9c58-4e33-8e49-0b217f85a652',
        name: 'Performance',
        key: 'PERF',
        type: RequirementType.NFR,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

describe('CategoriesService', () => {
    let service: CategoriesService;
    let categoriesRepository: CategoryRepositoryMock;
    let expectedCategory: Pick<Category, 'name' | 'key' | 'type'>;

    beforeEach(async () => {
        categoriesRepository = {
            create: vi.fn((category: DeepPartial<Category>) =>
                createCategory({
                    name: category.name ?? '',
                    key: category.key ?? '',
                    type: category.type ?? RequirementType.NFR,
                }),
            ),

            find: vi.fn().mockResolvedValue([]),

            findOne: vi.fn().mockResolvedValue(null),

            save: vi.fn((category: Category) => Promise.resolve(category)),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [CategoriesService, { provide: getRepositoryToken(Category), useValue: categoriesRepository }],
        }).compile();

        service = moduleRef.get(CategoriesService);
        expectedCategory = { name: 'Performance', key: 'PERF', type: RequirementType.NFR };
    });

    it('creates a category with a valid uppercase key.', async () => {
        vi.mocked(categoriesRepository.findOne).mockResolvedValue(null);

        const category = await service.create(expectedCategory);

        expect(category).toEqual({
            id: '0f25fbce-9c58-4e33-8e49-0b217f85a652',
            name: expectedCategory.name,
            key: expectedCategory.key,
            type: RequirementType.NFR,
            createdAt: '2026-06-07T00:00:00.000Z',
            updatedAt: '2026-06-07T00:00:00.000Z',
        });
        expect(categoriesRepository.create).toHaveBeenCalledWith(expectedCategory);
    });

    it('rejects lowercase category keys', async () => {
        await expect(
            service.create({
                name: expectedCategory.name,
                key: expectedCategory.key.toLowerCase(),
                type: RequirementType.NFR,
            }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(categoriesRepository.findOne).not.toHaveBeenCalled();
        expect(categoriesRepository.save).not.toHaveBeenCalled();
    });

    it('rejects category keys with unsupported characters', async () => {
        await expect(
            service.create({ name: 'Functional Requirements', key: '/nval/d-ke&', type: RequirementType.FR }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(categoriesRepository.findOne).not.toHaveBeenCalled();
        expect(categoriesRepository.save).not.toHaveBeenCalled();
    });

    it.each(['UI', 'AUTH', 'SEC'])('accepts %s as a category key segment.', async (key) => {
        await expect(service.create({ ...expectedCategory, key })).resolves.toEqual(expect.objectContaining({ key }));
    });

    it.each(['U', 'USERIF', 'Ui', 'UI1', 'UI_KEY', 'UI-KEY'])('rejects invalid category key %s.', async (key) => {
        await expect(service.create({ ...expectedCategory, key })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate category keys', async () => {
        const key = 'DUP';
        vi.mocked(categoriesRepository.findOne).mockResolvedValue(createCategory({ key }));

        await expect(
            service.create({ name: expectedCategory.name, key, type: RequirementType.NFR }),
        ).rejects.toBeInstanceOf(ConflictException);

        expect(categoriesRepository.save).not.toHaveBeenCalled();
    });

    it('lists categories ordered by key', async () => {
        vi.mocked(categoriesRepository.find).mockResolvedValue([createCategory({ key: expectedCategory.key })]);

        await expect(service.findAll()).resolves.toEqual([
            {
                id: '0f25fbce-9c58-4e33-8e49-0b217f85a652',
                name: 'Performance',
                key: 'PERF',
                type: RequirementType.NFR,
                createdAt: '2026-06-07T00:00:00.000Z',
                updatedAt: '2026-06-07T00:00:00.000Z',
            },
        ]);
        expect(categoriesRepository.find).toHaveBeenCalledWith({ order: { key: 'ASC' } });
    });
});
