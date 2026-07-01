import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { CategoriesService } from '@/categories/categories.service';
import { CategoryResponseDto } from '@/categories/dto/category-response.dto';
import { CreateCategoryDto } from '@/categories/dto/create-category.dto';
import { UpdateCategoryDto } from '@/categories/dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get(':project_id')
    @ApiOperation({ operationId: 'listCategories', summary: 'List all categories of a project.' })
    @ApiParam({ name: 'project_id', description: 'Project identifier.' })
    @ApiOkResponse({ description: 'All categories of the project.', type: CategoryResponseDto, isArray: true })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async findAll(@Param('project_id') projectId: string): Promise<CategoryResponseDto[]> {
        return this.categoriesService.findAll(projectId);
    }

    @Post(':project_id')
    @ApiOperation({ operationId: 'createCategory', summary: 'Create a category for a project.' })
    @ApiParam({ name: 'project_id', description: 'Project identifier.' })
    @ApiCreatedResponse({ description: 'The category was created.', type: CategoryResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async create(
        @Param('project_id') projectId: string,
        @Body() createCategoryDto: CreateCategoryDto,
    ): Promise<CategoryResponseDto> {
        return this.categoriesService.create(projectId, createCategoryDto);
    }

    @Patch(':project_id/:id')
    @ApiOperation({ operationId: 'updateCategory', summary: 'Update a category.' })
    @ApiParam({ name: 'project_id', description: 'Project identifier.' })
    @ApiParam({ name: 'id', description: 'Category identifier.' })
    @ApiOkResponse({ description: 'The category was updated.', type: CategoryResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    @ApiNotFoundResponse({ description: 'The project or category was not found.' })
    async update(
        @Param('project_id') projectId: string,
        @Param('id') categoryId: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ): Promise<CategoryResponseDto> {
        return this.categoriesService.update(projectId, categoryId, updateCategoryDto);
    }

    @Delete(':project_id/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ operationId: 'deleteCategory', summary: 'Delete a category.' })
    @ApiParam({ name: 'project_id', description: 'Project identifier.' })
    @ApiParam({ name: 'id', description: 'Category identifier.' })
    @ApiNoContentResponse({ description: 'The category was deleted.' })
    @ApiNotFoundResponse({ description: 'The project or category was not found.' })
    async delete(@Param('project_id') projectId: string, @Param('id') categoryId: string): Promise<void> {
        await this.categoriesService.delete(projectId, categoryId);
    }
}
