import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import type { Repository } from 'typeorm';

import { Category } from './category.entity';
import { CategoriesService } from './categories.service';

type CategoryRepositoryMock = Pick<
  Repository<Category>,
  'create' | 'find' | 'findOne' | 'save'
>;

const now = new Date('2026-06-07T00:00:00.000Z');

function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: '0f25fbce-9c58-4e33-8e49-0b217f85a652',
    name: 'Functional Requirements',
    key: 'FR',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoriesRepository: CategoryRepositoryMock;

  beforeEach(async () => {
    categoriesRepository = {
      create: vi.fn((category: Partial<Category>) => category as Category),
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn((category: Category) =>
        Promise.resolve(
          createCategory({ name: category.name, key: category.key }),
        ),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: categoriesRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  it('creates a category with a valid uppercase key', async () => {
    vi.mocked(categoriesRepository.findOne).mockResolvedValue(null);

    const category = await service.create({
      name: ' Functional Requirements ',
      key: 'FR_1',
    });

    expect(category).toEqual({
      id: '0f25fbce-9c58-4e33-8e49-0b217f85a652',
      name: 'Functional Requirements',
      key: 'FR_1',
      createdAt: '2026-06-07T00:00:00.000Z',
      updatedAt: '2026-06-07T00:00:00.000Z',
    });
    expect(categoriesRepository.create).toHaveBeenCalledWith({
      name: 'Functional Requirements',
      key: 'FR_1',
    });
  });

  it('rejects lowercase category keys', async () => {
    await expect(
      service.create({ name: 'Functional Requirements', key: 'fr' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(categoriesRepository.findOne).not.toHaveBeenCalled();
    expect(categoriesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects category keys with unsupported characters', async () => {
    await expect(
      service.create({ name: 'Functional Requirements', key: 'FR-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(categoriesRepository.findOne).not.toHaveBeenCalled();
    expect(categoriesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects duplicate category keys', async () => {
    vi.mocked(categoriesRepository.findOne).mockResolvedValue(
      createCategory({ key: 'FR' }),
    );

    await expect(
      service.create({ name: 'Functional Requirements', key: 'FR' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(categoriesRepository.save).not.toHaveBeenCalled();
  });

  it('lists categories ordered by key', async () => {
    vi.mocked(categoriesRepository.find).mockResolvedValue([
      createCategory({ key: 'FR' }),
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: '0f25fbce-9c58-4e33-8e49-0b217f85a652',
        name: 'Functional Requirements',
        key: 'FR',
        createdAt: '2026-06-07T00:00:00.000Z',
        updatedAt: '2026-06-07T00:00:00.000Z',
      },
    ]);
    expect(categoriesRepository.find).toHaveBeenCalledWith({
      order: { key: 'ASC' },
    });
  });
});
