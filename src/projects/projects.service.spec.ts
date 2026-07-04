import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, type TestingModule } from '@nestjs/testing';
import { Not } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Category } from '@/projects/categories.entity';
import type { CreateCategoryDto } from '@/projects/dto/create-category.dto';
import type { UpdateCategoryDto } from '@/projects/dto/update-category.dto';
import { Project } from '@/projects/projects.entity';
import { ProjectsService } from '@/projects/projects.service';
import { RequirementType } from '@/requirements/requirement-type.enum';

interface ProjectsRepositoryMock {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
}

interface CategoriesRepositoryMock {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
}

const PROJECT_ID = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b';
const CATEGORY_ID = '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d10';

function createProjectEntity(overrides: Partial<Project> = {}): Project {
    const project = new Project();

    project.id = PROJECT_ID;
    project.name = 'Test project';
    project.createdAt = new Date('2026-06-28T10:00:00.000Z');
    project.updatedAt = new Date('2026-06-28T10:00:00.000Z');
    project.categories = [];

    return Object.assign(project, overrides);
}

function createCategoryEntity(overrides: Partial<Category> = {}): Category {
    const category = new Category();

    category.id = CATEGORY_ID;
    category.projectId = PROJECT_ID;
    category.name = 'Authentication';
    category.key = 'AUTH';
    category.type = RequirementType.FR;
    category.createdAt = new Date('2026-06-28T10:00:00.000Z');
    category.updatedAt = new Date('2026-06-28T10:00:00.000Z');

    return Object.assign(category, overrides);
}

function createCreateCategoryDto(overrides: Partial<CreateCategoryDto> = {}): CreateCategoryDto {
    return { name: 'Authentication', key: 'AUTH', type: RequirementType.FR, ...overrides };
}

function createUpdateCategoryDto(overrides: Partial<UpdateCategoryDto> = {}): UpdateCategoryDto {
    return { name: 'Authentication', key: 'AUTH', type: RequirementType.FR, ...overrides };
}

describe('ProjectsService', () => {
    let service: ProjectsService;
    let projectsRepository: ProjectsRepositoryMock;
    let categoriesRepository: CategoriesRepositoryMock;

    beforeEach(async () => {
        projectsRepository = { create: vi.fn(), delete: vi.fn(), find: vi.fn(), findOne: vi.fn(), save: vi.fn() };
        categoriesRepository = { create: vi.fn(), delete: vi.fn(), find: vi.fn(), findOne: vi.fn(), save: vi.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectsService,
                { provide: getRepositoryToken(Project), useValue: projectsRepository },
                { provide: getRepositoryToken(Category), useValue: categoriesRepository },
            ],
        }).compile();

        service = module.get<ProjectsService>(ProjectsService);
    });

    describe('finds', () => {
        it('a project by id.', async () => {
            const project = createProjectEntity({ id: PROJECT_ID, name: 'Test project' });

            projectsRepository.findOne.mockResolvedValue(project);

            const result = await service.findOne(PROJECT_ID);

            expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
            expect(result).toEqual({
                id: PROJECT_ID,
                name: 'Test project',
                createdAt: new Date('2026-06-28T10:00:00.000Z'),
                updatedAt: new Date('2026-06-28T10:00:00.000Z'),
            });
        });

        it('throws NotFoundException if the project does not exist.', async () => {
            projectsRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne(PROJECT_ID)).rejects.toBeInstanceOf(NotFoundException);

            expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
        });

        it('all projects ordered by name.', async () => {
            const alphaProject = createProjectEntity({
                id: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2a',
                name: 'Alpha project',
            });

            const betaProject = createProjectEntity({
                id: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b',
                name: 'Beta project',
            });

            projectsRepository.find.mockResolvedValue([alphaProject, betaProject]);

            const result = await service.findAll();

            expect(projectsRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });

            expect(result).toEqual([
                {
                    id: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2a',
                    name: 'Alpha project',
                    createdAt: new Date('2026-06-28T10:00:00.000Z'),
                    updatedAt: new Date('2026-06-28T10:00:00.000Z'),
                },
                {
                    id: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b',
                    name: 'Beta project',
                    createdAt: new Date('2026-06-28T10:00:00.000Z'),
                    updatedAt: new Date('2026-06-28T10:00:00.000Z'),
                },
            ]);
        });
    });

    describe('creates', () => {
        it('a project.', async () => {
            const createdProject = createProjectEntity({
                id: undefined,
                name: 'Test project',
                createdAt: undefined,
                updatedAt: undefined,
            });

            const savedProject = createProjectEntity();

            projectsRepository.create.mockReturnValue(createdProject);
            projectsRepository.save.mockResolvedValue(savedProject);

            const result = await service.create({ name: 'Test project' });

            expect(projectsRepository.create).toHaveBeenCalledWith({ name: 'Test project' });
            expect(projectsRepository.save).toHaveBeenCalledWith(createdProject);

            expect(result).toEqual({
                id: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b',
                name: 'Test project',
                createdAt: new Date('2026-06-28T10:00:00.000Z'),
                updatedAt: new Date('2026-06-28T10:00:00.000Z'),
            });
        });
    });

    describe('updates', () => {
        it('a project.', async () => {
            const projectId = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b';

            const existingProject = createProjectEntity({ id: projectId, name: 'Old project name' });

            const savedProject = createProjectEntity({
                id: projectId,
                name: 'New project name',
                updatedAt: new Date('2026-06-28T11:00:00.000Z'),
            });

            projectsRepository.findOne.mockResolvedValue(existingProject);
            projectsRepository.save.mockResolvedValue(savedProject);

            const result = await service.update(projectId, { name: 'New project name' });

            expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: projectId } });
            expect(existingProject.name).toBe('New project name');
            expect(projectsRepository.save).toHaveBeenCalledWith(existingProject);

            expect(result).toEqual({
                id: projectId,
                name: 'New project name',
                createdAt: new Date('2026-06-28T10:00:00.000Z'),
                updatedAt: new Date('2026-06-28T11:00:00.000Z'),
            });
        });

        it('throws NotFoundException if the project does not exist.', async () => {
            const projectId = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b';

            projectsRepository.findOne.mockResolvedValue(null);

            await expect(service.update(projectId, { name: 'New project name' })).rejects.toBeInstanceOf(
                NotFoundException,
            );

            expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: projectId } });
            expect(projectsRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('deletes', () => {
        it('a project.', async () => {
            const projectId = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b';

            projectsRepository.delete.mockResolvedValue({ affected: 1 });

            await service.delete(projectId);

            expect(projectsRepository.delete).toHaveBeenCalledWith({ id: projectId });
        });

        it('throws NotFoundException if the project does not exist.', async () => {
            const projectId = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b';

            projectsRepository.delete.mockResolvedValue({ affected: 0 });

            await expect(service.delete(projectId)).rejects.toBeInstanceOf(NotFoundException);

            expect(projectsRepository.delete).toHaveBeenCalledWith({ id: projectId });
        });
    });

    describe('categories', () => {
        describe('findAllCategories', () => {
            it('returns all categories of a project sorted by name.', async () => {
                const alphaCategory = createCategoryEntity({
                    id: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11',
                    name: 'Authentication',
                    key: 'AUTH',
                    type: RequirementType.FR,
                });

                const betaCategory = createCategoryEntity({
                    id: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12',
                    name: 'Reporting',
                    key: 'RPT',
                    type: RequirementType.NFR,
                });

                projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                categoriesRepository.find.mockResolvedValue([alphaCategory, betaCategory]);

                const result = await service.findAllCategories(PROJECT_ID);

                expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
                expect(categoriesRepository.find).toHaveBeenCalledWith({
                    where: { projectId: PROJECT_ID },
                    order: { name: 'ASC' },
                });

                expect(result).toEqual([
                    {
                        id: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11',
                        projectId: PROJECT_ID,
                        name: 'Authentication',
                        key: 'AUTH',
                        type: RequirementType.FR,
                        createdAt: new Date('2026-06-28T10:00:00.000Z'),
                        updatedAt: new Date('2026-06-28T10:00:00.000Z'),
                    },
                    {
                        id: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12',
                        projectId: PROJECT_ID,
                        name: 'Reporting',
                        key: 'RPT',
                        type: RequirementType.NFR,
                        createdAt: new Date('2026-06-28T10:00:00.000Z'),
                        updatedAt: new Date('2026-06-28T10:00:00.000Z'),
                    },
                ]);
            });

            it('returns an empty array when the project exists but has no categories.', async () => {
                projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                categoriesRepository.find.mockResolvedValue([]);

                const result = await service.findAllCategories(PROJECT_ID);

                expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
                expect(categoriesRepository.find).toHaveBeenCalledWith({
                    where: { projectId: PROJECT_ID },
                    order: { name: 'ASC' },
                });

                expect(result).toEqual([]);
            });

            describe('throws', () => {
                it('NotFoundException when the project does not exist.', async () => {
                    projectsRepository.findOne.mockResolvedValue(null);

                    await expect(service.findAllCategories(PROJECT_ID)).rejects.toBeInstanceOf(NotFoundException);

                    expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
                    expect(categoriesRepository.find).not.toHaveBeenCalled();
                });
            });
        });

        describe('createCategory', () => {
            it('creates a category for an existing project.', async () => {
                const createdCategory = createCategoryEntity({
                    id: undefined,
                    createdAt: undefined,
                    updatedAt: undefined,
                });

                const savedCategory = createCategoryEntity();

                projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                categoriesRepository.findOne.mockResolvedValue(null);
                categoriesRepository.create.mockReturnValue(createdCategory);
                categoriesRepository.save.mockResolvedValue(savedCategory);

                const result = await service.createCategory(PROJECT_ID, createCreateCategoryDto());

                expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
                expect(categoriesRepository.create).toHaveBeenCalledWith({
                    projectId: PROJECT_ID,
                    name: 'Authentication',
                    key: 'AUTH',
                    type: RequirementType.FR,
                });
                expect(categoriesRepository.save).toHaveBeenCalledWith(createdCategory);

                expect(result).toEqual({
                    id: CATEGORY_ID,
                    projectId: PROJECT_ID,
                    name: 'Authentication',
                    key: 'AUTH',
                    type: RequirementType.FR,
                    createdAt: new Date('2026-06-28T10:00:00.000Z'),
                    updatedAt: new Date('2026-06-28T10:00:00.000Z'),
                });
            });

            describe('throws', () => {
                it('NotFoundException when the project does not exist.', async () => {
                    projectsRepository.findOne.mockResolvedValue(null);

                    await expect(service.createCategory(PROJECT_ID, createCreateCategoryDto())).rejects.toBeInstanceOf(
                        NotFoundException,
                    );

                    expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
                    expect(categoriesRepository.findOne).not.toHaveBeenCalled();
                    expect(categoriesRepository.create).not.toHaveBeenCalled();
                    expect(categoriesRepository.save).not.toHaveBeenCalled();
                });
                it('BadRequestException when the category name already exists in the project.', async () => {
                    const duplicateCategory = createCategoryEntity({
                        id: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12',
                        name: 'Authentication',
                        key: 'SEC',
                    });

                    projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                    categoriesRepository.findOne.mockResolvedValueOnce(duplicateCategory);

                    await expect(service.createCategory(PROJECT_ID, createCreateCategoryDto())).rejects.toBeInstanceOf(
                        BadRequestException,
                    );

                    expect(categoriesRepository.findOne).toHaveBeenCalledWith({
                        where: { projectId: PROJECT_ID, name: 'Authentication' },
                    });
                    expect(categoriesRepository.create).not.toHaveBeenCalled();
                    expect(categoriesRepository.save).not.toHaveBeenCalled();
                });

                it('BadRequestException when the category key already exists in the project.', async () => {
                    const duplicateCategory = createCategoryEntity({
                        id: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12',
                        name: 'Security',
                        key: 'AUTH',
                    });

                    projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                    categoriesRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(duplicateCategory);

                    await expect(service.createCategory(PROJECT_ID, createCreateCategoryDto())).rejects.toBeInstanceOf(
                        BadRequestException,
                    );

                    expect(categoriesRepository.findOne).toHaveBeenCalledWith({
                        where: { projectId: PROJECT_ID, name: 'Authentication' },
                    });
                    expect(categoriesRepository.findOne).toHaveBeenCalledWith({
                        where: { projectId: PROJECT_ID, key: 'AUTH' },
                    });
                    expect(categoriesRepository.create).not.toHaveBeenCalled();
                    expect(categoriesRepository.save).not.toHaveBeenCalled();
                });
            });
        });

        describe('updateCategory', () => {
            it('updates the category name.', async () => {
                const existingCategory = createCategoryEntity({ name: 'Old name' });
                const savedCategory = createCategoryEntity({
                    name: 'New name',
                    updatedAt: new Date('2026-06-28T11:00:00.000Z'),
                });

                projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                categoriesRepository.findOne.mockResolvedValueOnce(existingCategory).mockResolvedValueOnce(null);
                categoriesRepository.save.mockResolvedValue(savedCategory);

                const result = await service.updateCategory(PROJECT_ID, CATEGORY_ID, { name: 'New name' });

                expect(categoriesRepository.findOne).toHaveBeenCalledWith({
                    where: { id: CATEGORY_ID, projectId: PROJECT_ID },
                });
                expect(categoriesRepository.findOne).toHaveBeenCalledWith({
                    where: { projectId: PROJECT_ID, name: 'New name', id: Not(CATEGORY_ID) },
                });
                expect(existingCategory.name).toBe('New name');
                expect(categoriesRepository.save).toHaveBeenCalledWith(existingCategory);

                expect(result).toEqual({
                    id: CATEGORY_ID,
                    projectId: PROJECT_ID,
                    name: 'New name',
                    key: 'AUTH',
                    type: RequirementType.FR,
                    createdAt: new Date('2026-06-28T10:00:00.000Z'),
                    updatedAt: new Date('2026-06-28T11:00:00.000Z'),
                });
            });

            it('updates the category key.', async () => {
                const existingCategory = createCategoryEntity({ key: 'AUTH' });
                const savedCategory = createCategoryEntity({
                    key: 'SEC',
                    updatedAt: new Date('2026-06-28T11:00:00.000Z'),
                });

                projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                categoriesRepository.findOne.mockResolvedValueOnce(existingCategory).mockResolvedValueOnce(null);
                categoriesRepository.save.mockResolvedValue(savedCategory);

                await service.updateCategory(PROJECT_ID, CATEGORY_ID, { key: 'SEC' });

                expect(existingCategory.key).toBe('SEC');
                expect(categoriesRepository.save).toHaveBeenCalledWith(existingCategory);
            });

            it('updates the category type.', async () => {
                const existingCategory = createCategoryEntity({ type: RequirementType.FR });
                const savedCategory = createCategoryEntity({
                    type: RequirementType.NFR,
                    updatedAt: new Date('2026-06-28T11:00:00.000Z'),
                });

                projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                categoriesRepository.findOne.mockResolvedValueOnce(existingCategory);
                categoriesRepository.save.mockResolvedValue(savedCategory);

                await service.updateCategory(PROJECT_ID, CATEGORY_ID, { type: RequirementType.NFR });

                expect(existingCategory.type).toBe(RequirementType.NFR);
                expect(categoriesRepository.save).toHaveBeenCalledWith(existingCategory);
            });

            it('updates name, key, and type together.', async () => {
                const existingCategory = createCategoryEntity({
                    name: 'Old name',
                    key: 'OLD',
                    type: RequirementType.FR,
                });

                const savedCategory = createCategoryEntity({
                    name: 'New name',
                    key: 'NEW',
                    type: RequirementType.NFR,
                    updatedAt: new Date('2026-06-28T11:00:00.000Z'),
                });

                projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                categoriesRepository.findOne
                    .mockResolvedValueOnce(existingCategory)
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce(null);
                categoriesRepository.save.mockResolvedValue(savedCategory);

                const result = await service.updateCategory(
                    PROJECT_ID,
                    CATEGORY_ID,
                    createUpdateCategoryDto({ name: 'New name', key: 'NEW', type: RequirementType.NFR }),
                );

                expect(existingCategory.name).toBe('New name');
                expect(existingCategory.key).toBe('NEW');
                expect(existingCategory.type).toBe(RequirementType.NFR);
                expect(categoriesRepository.save).toHaveBeenCalledWith(existingCategory);

                expect(result).toEqual({
                    id: CATEGORY_ID,
                    projectId: PROJECT_ID,
                    name: 'New name',
                    key: 'NEW',
                    type: RequirementType.NFR,
                    createdAt: new Date('2026-06-28T10:00:00.000Z'),
                    updatedAt: new Date('2026-06-28T11:00:00.000Z'),
                });
            });

            it('allows keeping the same name and key on the same category.', async () => {
                const existingCategory = createCategoryEntity({ name: 'Authentication', key: 'AUTH' });

                projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                categoriesRepository.findOne
                    .mockResolvedValueOnce(existingCategory)
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce(null);
                categoriesRepository.save.mockResolvedValue(existingCategory);

                await service.updateCategory(
                    PROJECT_ID,
                    CATEGORY_ID,
                    createUpdateCategoryDto({ name: 'Authentication', key: 'AUTH' }),
                );

                expect(categoriesRepository.save).toHaveBeenCalledWith(existingCategory);
            });

            describe('throws', () => {
                it('NotFoundException when the project does not exist.', async () => {
                    projectsRepository.findOne.mockResolvedValue(null);

                    await expect(
                        service.updateCategory(PROJECT_ID, CATEGORY_ID, createUpdateCategoryDto()),
                    ).rejects.toBeInstanceOf(NotFoundException);

                    expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
                    expect(categoriesRepository.findOne).not.toHaveBeenCalled();
                    expect(categoriesRepository.save).not.toHaveBeenCalled();
                });

                it('NotFoundException when the category does not exist in the project.', async () => {
                    projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                    categoriesRepository.findOne.mockResolvedValue(null);

                    await expect(
                        service.updateCategory(PROJECT_ID, CATEGORY_ID, createUpdateCategoryDto()),
                    ).rejects.toBeInstanceOf(NotFoundException);

                    expect(categoriesRepository.findOne).toHaveBeenCalledWith({
                        where: { id: CATEGORY_ID, projectId: PROJECT_ID },
                    });
                    expect(categoriesRepository.save).not.toHaveBeenCalled();
                });

                it('BadRequestException when the updated name already exists in the same project.', async () => {
                    const existingCategory = createCategoryEntity({ id: CATEGORY_ID, name: 'Authentication' });

                    const duplicateCategory = createCategoryEntity({
                        id: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12',
                        name: 'Security',
                    });

                    projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                    categoriesRepository.findOne
                        .mockResolvedValueOnce(existingCategory)
                        .mockResolvedValueOnce(duplicateCategory);

                    await expect(
                        service.updateCategory(PROJECT_ID, CATEGORY_ID, { name: 'Security' }),
                    ).rejects.toBeInstanceOf(BadRequestException);

                    expect(categoriesRepository.save).not.toHaveBeenCalled();
                });

                it('BadRequestException when the updated key already exists in the same project.', async () => {
                    const existingCategory = createCategoryEntity({ id: CATEGORY_ID, key: 'AUTH' });

                    const duplicateCategory = createCategoryEntity({
                        id: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12',
                        key: 'SEC',
                    });

                    projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                    categoriesRepository.findOne
                        .mockResolvedValueOnce(existingCategory)
                        .mockResolvedValueOnce(duplicateCategory);

                    await expect(
                        service.updateCategory(PROJECT_ID, CATEGORY_ID, { key: 'SEC' }),
                    ).rejects.toBeInstanceOf(BadRequestException);

                    expect(categoriesRepository.save).not.toHaveBeenCalled();
                });
            });
        });

        describe('deleteCategory', () => {
            it('deletes a category from an existing project.', async () => {
                projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                categoriesRepository.delete.mockResolvedValue({ affected: 1 });

                await service.deleteCategory(PROJECT_ID, CATEGORY_ID);

                expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
                expect(categoriesRepository.delete).toHaveBeenCalledWith({ id: CATEGORY_ID, projectId: PROJECT_ID });
            });

            describe('throws', () => {
                it('NotFoundException when the project does not exist.', async () => {
                    projectsRepository.findOne.mockResolvedValue(null);

                    await expect(service.deleteCategory(PROJECT_ID, CATEGORY_ID)).rejects.toBeInstanceOf(
                        NotFoundException,
                    );

                    expect(projectsRepository.findOne).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
                    expect(categoriesRepository.delete).not.toHaveBeenCalled();
                });

                it('NotFoundException when the category does not exist in the project.', async () => {
                    projectsRepository.findOne.mockResolvedValue(createProjectEntity());
                    categoriesRepository.delete.mockResolvedValue({ affected: 0 });

                    await expect(service.deleteCategory(PROJECT_ID, CATEGORY_ID)).rejects.toBeInstanceOf(
                        NotFoundException,
                    );

                    expect(categoriesRepository.delete).toHaveBeenCalledWith({
                        id: CATEGORY_ID,
                        projectId: PROJECT_ID,
                    });
                });
            });
        });
    });
});
