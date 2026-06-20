import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoriesController } from '@/categories/categories.controller';
import { CategoriesService } from '@/categories/categories.service';
import type { CategoryResponseDto } from '@/categories/dto/category-response.dto';
import type { CreateCategoryDto } from '@/categories/dto/create-category.dto';
import { RequirementType } from '@/requirements/requirement-type-enum';

describe('CategoriesController', () => {
    let controller: CategoriesController;

    const category: CategoryResponseDto = {
        id: '0f25fbce-9c58-4e33-8e49-0b217f85a652',
        name: 'Performance',
        key: 'PERF',
        createdAt: '2026-06-07T00:00:00.000Z',
        updatedAt: '2026-06-07T00:00:00.000Z',
        type: RequirementType.NFR,
    };

    const categoriesServiceMock = { create: vi.fn(), findAll: vi.fn(), findOne: vi.fn() };

    beforeEach(async () => {
        vi.clearAllMocks();

        const moduleRef = await Test.createTestingModule({
            controllers: [CategoriesController],
            providers: [{ provide: CategoriesService, useValue: categoriesServiceMock }],
        }).compile();

        controller = moduleRef.get(CategoriesController);
    });

    it('delegates category creation to the service', async () => {
        const dto: CreateCategoryDto = { name: 'Performance', key: 'PERF', type: RequirementType.NFR };

        categoriesServiceMock.create.mockResolvedValue(category);

        await expect(controller.create(dto)).resolves.toEqual(category);

        expect(categoriesServiceMock.create).toHaveBeenCalledOnce();
        expect(categoriesServiceMock.create).toHaveBeenCalledWith(dto);
    });

    it('returns all categories from the service', async () => {
        categoriesServiceMock.findAll.mockResolvedValue([category]);

        await expect(controller.findAll()).resolves.toEqual([category]);

        expect(categoriesServiceMock.findAll).toHaveBeenCalledOnce();
    });

    it('retrieves a category by ID', async () => {
        categoriesServiceMock.findOne.mockResolvedValue(category);

        await expect(controller.findOne(category.id)).resolves.toEqual(category);

        expect(categoriesServiceMock.findOne).toHaveBeenCalledWith(category.id);
    });

    it('propagates errors from the service', async () => {
        const error = new NotFoundException('Category was not found');

        categoriesServiceMock.findOne.mockRejectedValue(error);

        await expect(controller.findOne('unknown-id')).rejects.toBe(error);
    });
});
