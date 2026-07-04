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

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { CategoryResponseDto } from '@/projects/dto/category-response.dto';
import { CreateCategoryDto } from '@/projects/dto/create-category.dto';
import { createCategorySchema, updateCategorySchema } from '@/projects/dto/project.schemas';
import { UpdateCategoryDto } from '@/projects/dto/update-category.dto';
import { ProjectsService } from '@/projects/projects.service';

@ApiTags('categories')
@Controller('projects/:projectId/categories')
export class CategoriesController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Get()
    @ApiOperation({ operationId: 'listCategories', summary: 'List all categories of a project.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiOkResponse({ description: 'All categories of the project.', type: CategoryResponseDto, isArray: true })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async findAllCategories(@Param('projectId') projectId: string): Promise<CategoryResponseDto[]> {
        return this.projectsService.findAllCategories(projectId);
    }

    @Post()
    @ApiOperation({ operationId: 'createCategory', summary: 'Create a category for a project.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiCreatedResponse({ description: 'The category was created.', type: CategoryResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async createCategory(
        @Param('projectId') projectId: string,
        @Body(new ZodValidationPipe(createCategorySchema)) createCategoryDto: CreateCategoryDto,
    ): Promise<CategoryResponseDto> {
        return this.projectsService.createCategory(projectId, createCategoryDto);
    }

    @Patch(':categoryId')
    @ApiOperation({ operationId: 'updateCategory', summary: 'Update a category.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'categoryId', description: 'Category identifier.' })
    @ApiOkResponse({ description: 'The category was updated.', type: CategoryResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    @ApiNotFoundResponse({ description: 'The project or category was not found.' })
    async updateCategory(
        @Param('projectId') projectId: string,
        @Param('categoryId') categoryId: string,
        @Body(new ZodValidationPipe(updateCategorySchema)) updateCategoryDto: UpdateCategoryDto,
    ): Promise<CategoryResponseDto> {
        return this.projectsService.updateCategory(projectId, categoryId, updateCategoryDto);
    }

    @Delete(':categoryId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ operationId: 'deleteCategory', summary: 'Delete a category.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'categoryId', description: 'Category identifier.' })
    @ApiNoContentResponse({ description: 'The category was deleted.' })
    @ApiNotFoundResponse({ description: 'The project or category was not found.' })
    async deleteCategory(
        @Param('projectId') projectId: string,
        @Param('categoryId') categoryId: string,
    ): Promise<void> {
        await this.projectsService.deleteCategory(projectId, categoryId);
    }
}
