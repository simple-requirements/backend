import type { CreateProjectDto } from '@/projects/dto/create-project.dto';
import type { ProjectResponseDto } from '@/projects/dto/project-response.dto';
import { Project } from '@/projects/project.entity';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROJECT_CREATE_FIELDS = ['name'] as const;

interface ProjectListRow {
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
    requirement_count: string;
}

interface ProjectCountRow {
    requirement_count: string;
}

/** Coordinates project creation and count-backed project reads. */
@Injectable()
export class ProjectsService {
    constructor(@InjectRepository(Project) private readonly projectsRepository: Repository<Project>) {}

    async create(createProjectDto: CreateProjectDto): Promise<ProjectResponseDto> {
        this.validateCreateProjectDto(createProjectDto);

        const project = this.projectsRepository.create({ name: createProjectDto.name.trim() });
        return this.toResponseDto(await this.projectsRepository.save(project), 0);
    }

    async findAll(): Promise<ProjectResponseDto[]> {
        const rawRows: unknown = await this.projectsRepository
            .createQueryBuilder('project')
            .leftJoin(
                'requirements',
                'requirement',
                'requirement.project_id = project.id AND requirement.status <> :deletedStatus',
                { deletedStatus: RequirementStatus.Deleted },
            )
            .select('project.id', 'id')
            .addSelect('project.name', 'name')
            .addSelect('project.created_at', 'created_at')
            .addSelect('project.updated_at', 'updated_at')
            .addSelect('COUNT(requirement.id)', 'requirement_count')
            .groupBy('project.id')
            .addGroupBy('project.name')
            .addGroupBy('project.created_at')
            .addGroupBy('project.updated_at')
            .orderBy('project.created_at', 'ASC')
            .addOrderBy('project.id', 'ASC')
            .getRawMany();
        const rows = Array.isArray(rawRows) ? (rawRows as ProjectListRow[]) : [];

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            requirementCount: Number(row.requirement_count),
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString(),
        }));
    }

    async findOne(id: string): Promise<ProjectResponseDto> {
        this.validateProjectId(id);
        const project = await this.projectsRepository.findOne({ where: { id } });
        if (project === null) {
            throw new NotFoundException(`Project "${id}" was not found`);
        }
        return this.toResponseDto(project, await this.countRequirements(id));
    }

    async ensureExists(id: string): Promise<Project> {
        this.validateProjectId(id);
        const project = await this.projectsRepository.findOne({ where: { id } });
        if (project === null) {
            throw new NotFoundException(`Project "${id}" was not found`);
        }
        return project;
    }

    private async countRequirements(projectId: string): Promise<number> {
        const row = (await this.projectsRepository.manager
            .createQueryBuilder()
            .select('COUNT(requirement.id)', 'requirement_count')
            .from('requirements', 'requirement')
            .where('requirement.project_id = :projectId', { projectId })
            .andWhere('requirement.status <> :deletedStatus', { deletedStatus: RequirementStatus.Deleted })
            .getRawOne()) as ProjectCountRow | undefined;

        return Number(row?.requirement_count ?? 0);
    }

    private validateCreateProjectDto(createProjectDto: CreateProjectDto): void {
        if (typeof createProjectDto !== 'object' || createProjectDto === null) {
            throw new BadRequestException('Project request body is required');
        }
        for (const field of Object.keys(createProjectDto)) {
            if (!(PROJECT_CREATE_FIELDS as readonly string[]).includes(field)) {
                throw new BadRequestException(`Project ${field} is not allowed`);
            }
        }
        if (typeof createProjectDto.name !== 'string' || createProjectDto.name.trim() === '') {
            throw new BadRequestException('Project name is required');
        }
        if (createProjectDto.name.trim().length > 120) {
            throw new BadRequestException('Project name must be no longer than 120 characters');
        }
    }

    private validateProjectId(id: string): void {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new BadRequestException('Project id is required');
        }
        if (!UUID_PATTERN.test(id)) {
            throw new BadRequestException('Project id must be a valid UUID');
        }
    }

    private toResponseDto(project: Project, requirementCount: number): ProjectResponseDto {
        return {
            id: project.id,
            name: project.name,
            requirementCount,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
        };
    }
}
