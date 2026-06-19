import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { CATEGORY_KEY_PATTERN } from '@/requirements/requirement-key-patterns';

import { Category } from '@/categories/category.entity';
import type { CategoryResponseDto } from '@/categories/dto/category-response.dto';
import type { CreateCategoryDto } from '@/categories/dto/create-category.dto';

const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

/**
 * Applies category validation and persistence rules for the category API.
 *
 * Category keys are part of visible requirement keys, so this service treats
 * them as durable identifiers and converts PostgreSQL uniqueness failures into
 * stable HTTP conflict errors.
 */
@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoriesRepository: Repository<Category>,
    ) {}

    /**
     * Creates a category after validating the durable key format.
     *
     * @param createCategoryDto - Category name and key supplied by the client.
     * @returns The persisted category response.
     * @throws BadRequestException If the request body or key format is invalid.
     * @throws ConflictException If the key is already reserved.
     */
    async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        this.validateCreateCategoryDto(createCategoryDto);

        const existingCategory = await this.categoriesRepository.findOne({ where: { key: createCategoryDto.key } });

        if (existingCategory !== null) {
            throw new ConflictException(`Category key "${createCategoryDto.key}" already exists`);
        }

        const category = this.categoriesRepository.create({
            name: createCategoryDto.name.trim(),
            key: createCategoryDto.key,
            type: createCategoryDto.type,
        });

        try {
            return this.toResponseDto(await this.categoriesRepository.save(category));
        } catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new ConflictException(`Category key "${createCategoryDto.key}" already exists`);
            }

            throw error;
        }
    }

    async findAll(): Promise<CategoryResponseDto[]> {
        const categories = await this.categoriesRepository.find({ order: { key: 'ASC' } });

        return categories.map((category) => this.toResponseDto(category));
    }

    async findOne(id: string): Promise<CategoryResponseDto> {
        const category = await this.categoriesRepository.findOne({ where: { id } });

        if (category === null) {
            throw new NotFoundException(`Category "${id}" was not found`);
        }

        return this.toResponseDto(category);
    }

    private validateCreateCategoryDto(createCategoryDto: CreateCategoryDto): void {
        if (typeof createCategoryDto !== 'object' || createCategoryDto === null) {
            throw new BadRequestException('Category request body is required');
        }

        if (typeof createCategoryDto.name !== 'string' || createCategoryDto.name.trim() === '') {
            throw new BadRequestException('Category name is required');
        }

        if (createCategoryDto.name.trim().length > 120) {
            throw new BadRequestException('Category name must be no longer than 120 characters');
        }

        if (!Object.values(RequirementType).includes(createCategoryDto.type)) {
            throw new BadRequestException('Category type must be FR or NFR');
        }

        if (Array.isArray((createCategoryDto as unknown as Record<string, unknown>).type)) {
            throw new BadRequestException('Category type must be a single FR or NFR value');
        }

        if (typeof createCategoryDto.key !== 'string') {
            throw new BadRequestException('Category key is required');
        }

        if (!CATEGORY_KEY_PATTERN.test(createCategoryDto.key)) {
            throw new BadRequestException('Category key must contain 2 to 4 uppercase letters');
        }
    }

    private toResponseDto(category: Category): CategoryResponseDto {
        return {
            id: category.id,
            name: category.name,
            key: category.key,
            type: category.type,
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString(),
        };
    }

    /**
     * Detects PostgreSQL unique-constraint failures without leaking driver errors to callers.
     *
     * @param error - Unknown error thrown by TypeORM or the PostgreSQL driver.
     * @returns True when the error is PostgreSQL SQLSTATE 23505.
     */
    private isUniqueViolation(error: unknown): boolean {
        return (
            error instanceof QueryFailedError
            && typeof error.driverError === 'object'
            && error.driverError !== null
            && 'code' in error.driverError
            && (error.driverError as Record<string, unknown>).code === POSTGRES_UNIQUE_VIOLATION_CODE
        );
    }
}
