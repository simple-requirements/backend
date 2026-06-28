import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { ProjectResponseDto } from '@/projects/dto/project-response.dto';
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
        const name = createProjectDto.name.trim();

        if (!name) {
            throw new BadRequestException('Project name must not be empty.');
        }

        const project = this.projectsRepository.create({ name });

        const savedProject = await this.projectsRepository.save(project);

        return this.toResponseDto(savedProject);
    }

    private toResponseDto(project: Project): ProjectResponseDto {
        return { id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt };
    }
}
