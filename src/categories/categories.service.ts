import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Category } from './category.entity';
import type { CategoryResponseDto } from './dto/category-response.dto';
import type { CreateCategoryDto } from './dto/create-category.dto';

const CATEGORY_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoriesRepository: Repository<Category>,
    ) {}

    async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        this.validateCreateCategoryDto(createCategoryDto);

        const existingCategory = await this.categoriesRepository.findOne({ where: { key: createCategoryDto.key } });

        if (existingCategory !== null) {
            throw new ConflictException(`Category key "${createCategoryDto.key}" already exists`);
        }

        const category = this.categoriesRepository.create({
            name: createCategoryDto.name.trim(),
            key: createCategoryDto.key,
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

        if (typeof createCategoryDto.key !== 'string') {
            throw new BadRequestException('Category key is required');
        }

        if (createCategoryDto.key.length > 40) {
            throw new BadRequestException('Category key must be no longer than 40 characters');
        }

        if (!CATEGORY_KEY_PATTERN.test(createCategoryDto.key)) {
            throw new BadRequestException(
                'Category key must be uppercase and contain only A-Z, 0-9, or underscore characters',
            );
        }
    }

    private toResponseDto(category: Category): CategoryResponseDto {
        return {
            id: category.id,
            name: category.name,
            key: category.key,
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString(),
        };
    }

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
