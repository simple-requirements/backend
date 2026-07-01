import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { Category } from '@/categories/categories.entity';
import { CategoryResponseDto } from '@/categories/dto/category-response.dto';
import { CreateCategoryDto } from '@/categories/dto/create-category.dto';
import { UpdateCategoryDto } from '@/categories/dto/update-category.dto';
import { Project } from '@/projects/projects.entity';
import { RequirementType } from '@/requirements/requirement-type.enum';

type CategoryValues = Readonly<{ name: string; key: string; type: RequirementType }>;

interface CategoryPatchValues {
    name?: string;
    key?: string;
    type?: RequirementType;
}

const CATEGORY_KEY_REGEX = /^[A-Z]{2,4}$/;

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoriesRepository: Repository<Category>,

        @InjectRepository(Project)
        private readonly projectsRepository: Repository<Project>,
    ) {}

    async findAll(projectId: string): Promise<CategoryResponseDto[]> {
        await this.getProjectOrThrow(projectId);

        const categories = await this.categoriesRepository.find({ where: { projectId }, order: { name: 'ASC' } });

        return categories.map((category) => this.toResponseDto(category));
    }

    async create(projectId: string, createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        await this.getProjectOrThrow(projectId);

        const categoryValues = this.normalizeCreateCategoryDto(createCategoryDto);

        await this.ensureCategoryNameAvailable(projectId, categoryValues.name);
        await this.ensureCategoryKeyAvailable(projectId, categoryValues.key);

        const category = this.categoriesRepository.create({ ...categoryValues, projectId });

        const savedCategory = await this.categoriesRepository.save(category);

        return this.toResponseDto(savedCategory);
    }

    async update(
        projectId: string,
        categoryId: string,
        updateCategoryDto: UpdateCategoryDto,
    ): Promise<CategoryResponseDto> {
        await this.getProjectOrThrow(projectId);

        const category = await this.getCategoryOrThrow(projectId, categoryId);
        const categoryPatch = this.normalizeUpdateCategoryDto(updateCategoryDto);

        if (categoryPatch.name !== undefined) {
            await this.ensureCategoryNameAvailable(projectId, categoryPatch.name, categoryId);
            category.name = categoryPatch.name;
        }

        if (categoryPatch.key !== undefined) {
            await this.ensureCategoryKeyAvailable(projectId, categoryPatch.key, categoryId);
            category.key = categoryPatch.key;
        }

        if (categoryPatch.type !== undefined) {
            category.type = categoryPatch.type;
        }

        const savedCategory = await this.categoriesRepository.save(category);

        return this.toResponseDto(savedCategory);
    }

    async delete(projectId: string, categoryId: string): Promise<void> {
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

    private normalizeCreateCategoryDto(createCategoryDto: CreateCategoryDto): CategoryValues {
        const requestBody = this.toRequestBodyRecord(createCategoryDto);

        return {
            name: this.normalizeCategoryName(requestBody.name),
            key: this.normalizeCategoryKey(requestBody.key),
            type: this.normalizeRequirementType(requestBody.type),
        };
    }

    private normalizeUpdateCategoryDto(updateCategoryDto: UpdateCategoryDto): CategoryPatchValues {
        const requestBody = this.toRequestBodyRecord(updateCategoryDto);
        const categoryPatch: CategoryPatchValues = {};

        if ('name' in requestBody) {
            categoryPatch.name = this.normalizeCategoryName(requestBody.name);
        }

        if ('key' in requestBody) {
            categoryPatch.key = this.normalizeCategoryKey(requestBody.key);
        }

        if ('type' in requestBody) {
            categoryPatch.type = this.normalizeRequirementType(requestBody.type);
        }

        if (Object.keys(categoryPatch).length === 0) {
            throw new BadRequestException('At least one category field must be provided.');
        }

        return categoryPatch;
    }

    private toRequestBodyRecord(requestBody: unknown): Record<string, unknown> {
        if (typeof requestBody !== 'object' || requestBody === null || Array.isArray(requestBody)) {
            throw new BadRequestException('Category request body must be an object.');
        }

        return requestBody as Record<string, unknown>;
    }

    private normalizeCategoryName(name: unknown): string {
        if (typeof name !== 'string') {
            throw new BadRequestException('Category name must be a string.');
        }

        const normalizedName = name.trim();

        if (normalizedName === '') {
            throw new BadRequestException('Category name must not be empty.');
        }

        return normalizedName;
    }

    private normalizeCategoryKey(key: unknown): string {
        if (typeof key !== 'string') {
            throw new BadRequestException('Category key must be a string.');
        }

        const normalizedKey = key.trim().toUpperCase();

        if (!CATEGORY_KEY_REGEX.test(normalizedKey)) {
            throw new BadRequestException('Category key must contain 2 to 4 uppercase letters.');
        }

        return normalizedKey;
    }

    private normalizeRequirementType(type: unknown): RequirementType {
        if (type === RequirementType.FR || type === RequirementType.NFR) {
            return type;
        }

        throw new BadRequestException('Category type must be either FR or NFR.');
    }

    private toResponseDto(category: Category): CategoryResponseDto {
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
