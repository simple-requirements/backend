import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { ProjectResponseDto } from '@/projects/dto/project-response.dto';
import { UpdateProjectDto } from '@/projects/dto/update-project.dto';
import { Project } from '@/projects/projects.entity';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(Project)
        private readonly projectsRepository: Repository<Project>,
    ) {}

    async findAll(): Promise<ProjectResponseDto[]> {
        const projects = await this.projectsRepository.find({ order: { name: 'ASC' } });

        return projects.map((project) => this.toResponseDto(project));
    }

    async create(createProjectDto: CreateProjectDto): Promise<ProjectResponseDto> {
        const name = this.normalizeProjectName(createProjectDto.name);

        const project = this.projectsRepository.create({ name });
        const savedProject = await this.projectsRepository.save(project);

        return this.toResponseDto(savedProject);
    }

    async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ProjectResponseDto> {
        const name = this.normalizeProjectName(updateProjectDto.name);

        const project = await this.projectsRepository.findOne({ where: { id } });

        if (project === null) {
            throw new NotFoundException(`Project with id "${id}" was not found.`);
        }

        project.name = name;

        const savedProject = await this.projectsRepository.save(project);

        return this.toResponseDto(savedProject);
    }

    async delete(id: string): Promise<void> {
        const deleteResult = await this.projectsRepository.delete({ id });

        if (deleteResult.affected !== 1) {
            throw new NotFoundException(`Project with id "${id}" was not found.`);
        }
    }

    private normalizeProjectName(name: string): string {
        const normalizedName = name.trim();

        if (!normalizedName) {
            throw new BadRequestException('Project name must not be empty.');
        }

        return normalizedName;
    }

    private toResponseDto(project: Project): ProjectResponseDto {
        return { id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt };
    }
}
