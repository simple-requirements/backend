import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Project } from '@/projects/project.entity';
import { ProjectsService } from '@/projects/projects.service';

const baseProject: Project = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Product A',
    createdAt: new Date('2026-06-12T00:00:00.000Z'),
    updatedAt: new Date('2026-06-12T00:00:01.000Z'),
};

describe('ProjectsService', () => {
    let service: ProjectsService;
    const queryBuilderMock = {
        leftJoin: vi.fn(),
        select: vi.fn(),
        addSelect: vi.fn(),
        groupBy: vi.fn(),
        addGroupBy: vi.fn(),
        orderBy: vi.fn(),
        addOrderBy: vi.fn(),
        getRawMany: vi.fn(),
    };
    const countQueryBuilderMock = {
        select: vi.fn(),
        from: vi.fn(),
        where: vi.fn(),
        andWhere: vi.fn(),
        getRawOne: vi.fn(),
    };
    const projectsRepositoryMock = {
        create: vi.fn(),
        save: vi.fn(),
        findOne: vi.fn(),
        createQueryBuilder: vi.fn(),
        manager: { createQueryBuilder: vi.fn() },
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        for (const method of ['leftJoin', 'select', 'addSelect', 'groupBy', 'addGroupBy', 'orderBy', 'addOrderBy']) {
            queryBuilderMock[method as keyof typeof queryBuilderMock].mockReturnValue(queryBuilderMock);
        }
        for (const method of ['select', 'from', 'where', 'andWhere']) {
            countQueryBuilderMock[method as keyof typeof countQueryBuilderMock].mockReturnValue(countQueryBuilderMock);
        }
        projectsRepositoryMock.create.mockImplementation((value: Partial<Project>) => ({ ...value }));
        projectsRepositoryMock.createQueryBuilder.mockReturnValue(queryBuilderMock);
        projectsRepositoryMock.manager.createQueryBuilder.mockReturnValue(countQueryBuilderMock);

        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectsService, { provide: getRepositoryToken(Project), useValue: projectsRepositoryMock }],
        }).compile();
        service = module.get(ProjectsService);
    });

    it('creates a project with a trimmed valid name and zero requirement count.', async () => {
        projectsRepositoryMock.save.mockResolvedValue(baseProject);
        await expect(service.create({ name: ' Product A ' })).resolves.toEqual({
            id: baseProject.id,
            name: 'Product A',
            requirementCount: 0,
            createdAt: '2026-06-12T00:00:00.000Z',
            updatedAt: '2026-06-12T00:00:01.000Z',
        });
        expect(projectsRepositoryMock.create).toHaveBeenCalledWith({ name: 'Product A' });
    });

    it('rejects missing, empty, whitespace-only, and unknown project create fields.', async () => {
        await expect(service.create({} as { name: string })).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.create({ name: '' })).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.create({ name: '   ' })).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.create({ name: 'A', id: baseProject.id } as { name: string })).rejects.toThrow(
            'Project id is not allowed',
        );
    });

    it('lists projects using one aggregate count query.', async () => {
        queryBuilderMock.getRawMany.mockResolvedValue([
            {
                id: baseProject.id,
                name: baseProject.name,
                created_at: baseProject.createdAt,
                updated_at: baseProject.updatedAt,
                requirement_count: '2',
            },
        ]);
        await expect(service.findAll()).resolves.toEqual([expect.objectContaining({ requirementCount: 2 })]);
        expect(projectsRepositoryMock.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('retrieves a project with a derived requirement count.', async () => {
        projectsRepositoryMock.findOne.mockResolvedValue(baseProject);
        countQueryBuilderMock.getRawOne.mockResolvedValue({ requirement_count: '1' });
        await expect(service.findOne(baseProject.id)).resolves.toEqual(
            expect.objectContaining({ requirementCount: 1 }),
        );
    });

    it('returns not found for an unknown project.', async () => {
        projectsRepositoryMock.findOne.mockResolvedValue(null);
        await expect(service.findOne(baseProject.id)).rejects.toBeInstanceOf(NotFoundException);
    });
});
