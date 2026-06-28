import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Project } from '@/projects/projects.entity';
import { ProjectsService } from '@/projects/projects.service';

type ProjectsRepositoryMock = { create: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };

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
        projectsRepository = { create: vi.fn(), save: vi.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectsService, { provide: getRepositoryToken(Project), useValue: projectsRepository }],
        }).compile();

        service = module.get<ProjectsService>(ProjectsService);
    });

    describe('creates', () => {
        it('a project and trimms the name.', async () => {
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

    describe('throws BadRequestException', () => {
        it('if the project name is empty.', async () => {
            await expect(service.create({ name: '' })).rejects.toBeInstanceOf(BadRequestException);

            expect(projectsRepository.create).not.toHaveBeenCalled();
            expect(projectsRepository.save).not.toHaveBeenCalled();
        });

        it('if the project name contains only whitespace.', async () => {
            await expect(service.create({ name: '   ' })).rejects.toBeInstanceOf(BadRequestException);

            expect(projectsRepository.create).not.toHaveBeenCalled();
            expect(projectsRepository.save).not.toHaveBeenCalled();
        });
    });
});
