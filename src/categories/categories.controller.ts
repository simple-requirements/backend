import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { CategoriesService } from '@/categories/categories.service';
import type { CategoryResponseDto } from '@/categories/dto/category-response.dto';
import { CreateCategoryDto } from '@/categories/dto/create-category.dto';

/**
 * HTTP boundary for category creation and lookup.
 *
 * Validation and persistence stay in CategoriesService so category-key rules are
 * enforced consistently across direct service calls and HTTP requests.
 */
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Post()
    @ApiOperation({ summary: 'Create a category.' })
    @ApiBody({ type: CreateCategoryDto, description: 'Category name and stable uppercase key.' })
    @ApiCreatedResponse({ description: 'Category created.' })
    @ApiBadRequestResponse({ description: 'Malformed category input.' })
    @ApiConflictResponse({ description: 'Category key already exists.' })
    async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        return this.categoriesService.create(createCategoryDto);
    }

    @Get()
    @ApiOperation({ summary: 'List categories.' })
    @ApiOkResponse({ description: 'Categories ordered by key.' })
    async findAll(): Promise<CategoryResponseDto[]> {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Retrieve a category by UUID.' })
    @ApiParam({ name: 'id' })
    @ApiOkResponse({ description: 'Category found.' })
    @ApiNotFoundResponse({ description: 'Category was not found.' })
    async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
        return this.categoriesService.findOne(id);
    }
}
