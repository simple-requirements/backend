import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Project } from '@/projects/projects.entity';
import { ProjectsService } from '@/projects/projects.service';

interface ProjectsRepositoryMock {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
}

function createProjectEntity(overrides: Partial<Project> = {}): Project {
    const project = new Project();

    project.id = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b';
    project.name = 'Test project';
    project.createdAt = new Date('2026-06-28T10:00:00.000Z');
    project.updatedAt = new Date('2026-06-28T10:00:00.000Z');

    return Object.assign(project, overrides);
}

describe('ProjectsService', () => {
    let service: ProjectsService;
    let projectsRepository: ProjectsRepositoryMock;

    beforeEach(async () => {
        projectsRepository = { create: vi.fn(), delete: vi.fn(), find: vi.fn(), findOne: vi.fn(), save: vi.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectsService, { provide: getRepositoryToken(Project), useValue: projectsRepository }],
        }).compile();

        service = module.get<ProjectsService>(ProjectsService);
    });

    describe('finds', () => {
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
        it('a project and trims the name.', async () => {
            const createdProject = createProjectEntity({
                id: undefined,
                name: 'Test project',
                createdAt: undefined,
                updatedAt: undefined,
            });

            const savedProject = createProjectEntity();

            projectsRepository.create.mockReturnValue(createdProject);
            projectsRepository.save.mockResolvedValue(savedProject);

            const result = await service.create({ name: '  Test project  ' });

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
        it('a project and trims the name.', async () => {
            const projectId = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b';

            const existingProject = createProjectEntity({ id: projectId, name: 'Old project name' });

            const savedProject = createProjectEntity({
                id: projectId,
                name: 'New project name',
                updatedAt: new Date('2026-06-28T11:00:00.000Z'),
            });

            projectsRepository.findOne.mockResolvedValue(existingProject);
            projectsRepository.save.mockResolvedValue(savedProject);

            const result = await service.update(projectId, { name: '  New project name  ' });

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

    describe('throws BadRequestException', () => {
        it('if the project name is empty while creating.', async () => {
            await expect(service.create({ name: '' })).rejects.toBeInstanceOf(BadRequestException);

            expect(projectsRepository.create).not.toHaveBeenCalled();
            expect(projectsRepository.save).not.toHaveBeenCalled();
        });

        it('if the project name contains only whitespace while creating.', async () => {
            await expect(service.create({ name: '   ' })).rejects.toBeInstanceOf(BadRequestException);

            expect(projectsRepository.create).not.toHaveBeenCalled();
            expect(projectsRepository.save).not.toHaveBeenCalled();
        });

        it('if the project name is empty while updating.', async () => {
            await expect(service.update('9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b', { name: '' })).rejects.toBeInstanceOf(
                BadRequestException,
            );

            expect(projectsRepository.findOne).not.toHaveBeenCalled();
            expect(projectsRepository.save).not.toHaveBeenCalled();
        });

        it('if the project name contains only whitespace while updating.', async () => {
            await expect(
                service.update('9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b', { name: '   ' }),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(projectsRepository.findOne).not.toHaveBeenCalled();
            expect(projectsRepository.save).not.toHaveBeenCalled();
        });
    });
});
