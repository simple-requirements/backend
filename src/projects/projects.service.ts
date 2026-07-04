import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { Category } from '@/projects/categories.entity';
import { CategoryResponseDto } from '@/projects/dto/category-response.dto';
import { CreateCategoryDto } from '@/projects/dto/create-category.dto';
import { UpdateCategoryDto } from '@/projects/dto/update-category.dto';
import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { ProjectResponseDto } from '@/projects/dto/project-response.dto';
import { UpdateProjectDto } from '@/projects/dto/update-project.dto';
import { Project } from '@/projects/projects.entity';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(Project)
        private readonly projectsRepository: Repository<Project>,

        @InjectRepository(Category)
        private readonly categoriesRepository: Repository<Category>,
    ) {}

    async findAll(): Promise<ProjectResponseDto[]> {
        const projects = await this.projectsRepository.find({ order: { name: 'ASC' } });

        return projects.map((project) => this.toProjectResponseDto(project));
    }

    async findOne(id: string): Promise<ProjectResponseDto> {
        const project = await this.getProjectOrThrow(id);

        return this.toProjectResponseDto(project);
    }

    async create(createProjectDto: CreateProjectDto): Promise<ProjectResponseDto> {
        const project = this.projectsRepository.create({ name: createProjectDto.name });
        const savedProject = await this.projectsRepository.save(project);

        return this.toProjectResponseDto(savedProject);
    }

    async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ProjectResponseDto> {
        const project = await this.getProjectOrThrow(id);

        project.name = updateProjectDto.name;

        const savedProject = await this.projectsRepository.save(project);

        return this.toProjectResponseDto(savedProject);
    }

    async delete(id: string): Promise<void> {
        const deleteResult = await this.projectsRepository.delete({ id });

        if (deleteResult.affected !== 1) {
            throw new NotFoundException(`Project with id "${id}" was not found.`);
        }
    }

    async findAllCategories(projectId: string): Promise<CategoryResponseDto[]> {
        await this.getProjectOrThrow(projectId);

        const categories = await this.categoriesRepository.find({ where: { projectId }, order: { name: 'ASC' } });

        return categories.map((category) => this.toCategoryResponseDto(category));
    }

    async createCategory(projectId: string, createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        await this.getProjectOrThrow(projectId);

        await this.ensureCategoryNameAvailable(projectId, createCategoryDto.name);
        await this.ensureCategoryKeyAvailable(projectId, createCategoryDto.key);

        const category = this.categoriesRepository.create({
            projectId,
            name: createCategoryDto.name,
            key: createCategoryDto.key,
            type: createCategoryDto.type,
        });
        const savedCategory = await this.categoriesRepository.save(category);

        return this.toCategoryResponseDto(savedCategory);
    }

    async updateCategory(
        projectId: string,
        categoryId: string,
        updateCategoryDto: UpdateCategoryDto,
    ): Promise<CategoryResponseDto> {
        await this.getProjectOrThrow(projectId);

        const category = await this.getCategoryOrThrow(projectId, categoryId);

        if (updateCategoryDto.name !== undefined) {
            await this.ensureCategoryNameAvailable(projectId, updateCategoryDto.name, categoryId);
            category.name = updateCategoryDto.name;
        }

        if (updateCategoryDto.key !== undefined) {
            await this.ensureCategoryKeyAvailable(projectId, updateCategoryDto.key, categoryId);
            category.key = updateCategoryDto.key;
        }

        if (updateCategoryDto.type !== undefined) {
            category.type = updateCategoryDto.type;
        }

        const savedCategory = await this.categoriesRepository.save(category);

        return this.toCategoryResponseDto(savedCategory);
    }

    async deleteCategory(projectId: string, categoryId: string): Promise<void> {
        await this.getProjectOrThrow(projectId);

        const deleteResult = await this.categoriesRepository.delete({ id: categoryId, projectId });

        if (deleteResult.affected !== 1) {
            throw new NotFoundException(`Category with id "${categoryId}" in project "${projectId}" was not found.`);
        }
    }

    private async getProjectOrThrow(projectId: string): Promise<Project> {
        const project = await this.projectsRepository.findOne({ where: { id: projectId } });

        if (project === null) {
            throw new NotFoundException(`Project with id "${projectId}" was not found.`);
        }

        return project;
    }

    private async getCategoryOrThrow(projectId: string, categoryId: string): Promise<Category> {
        const category = await this.categoriesRepository.findOne({ where: { id: categoryId, projectId } });

        if (category === null) {
            throw new NotFoundException(`Category with id "${categoryId}" in project "${projectId}" was not found.`);
        }

        return category;
    }

    private async ensureCategoryNameAvailable(
        projectId: string,
        name: string,
        excludedCategoryId?: string,
    ): Promise<void> {
        const duplicateCategory = await this.categoriesRepository.findOne({
            where:
                excludedCategoryId === undefined ?
                    { projectId, name }
                :   { projectId, name, id: Not(excludedCategoryId) },
        });

        if (duplicateCategory !== null) {
            throw new BadRequestException(`Category name "${name}" already exists in this project.`);
        }
    }

    private async ensureCategoryKeyAvailable(
        projectId: string,
        key: string,
        excludedCategoryId?: string,
    ): Promise<void> {
        const duplicateCategory = await this.categoriesRepository.findOne({
            where:
                excludedCategoryId === undefined ? { projectId, key } : { projectId, key, id: Not(excludedCategoryId) },
        });

        if (duplicateCategory !== null) {
            throw new BadRequestException(`Category key "${key}" already exists in this project.`);
        }
    }

    private toProjectResponseDto(project: Project): ProjectResponseDto {
        return { id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt };
    }

    private toCategoryResponseDto(category: Category): CategoryResponseDto {
        return {
            id: category.id,
            projectId: category.projectId,
            name: category.name,
            key: category.key,
            type: category.type,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        };
    }
}
