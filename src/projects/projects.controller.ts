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
import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { ProjectResponseDto } from '@/projects/dto/project-response.dto';
import { createProjectSchema, updateProjectSchema } from '@/projects/dto/project.schemas';
import { UpdateProjectDto } from '@/projects/dto/update-project.dto';
import { ProjectsService } from '@/projects/projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Get()
    @ApiOperation({ operationId: 'listProjects', summary: 'List all projects.' })
    @ApiOkResponse({ description: 'All projects.', type: ProjectResponseDto, isArray: true })
    async findAll(): Promise<ProjectResponseDto[]> {
        return this.projectsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ operationId: 'getProject', summary: 'Get one project.' })
    @ApiParam({ name: 'id', description: 'Project identifier.' })
    @ApiOkResponse({ description: 'The project.', type: ProjectResponseDto })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async findOne(@Param('id') id: string): Promise<ProjectResponseDto> {
        return this.projectsService.findOne(id);
    }

    @Post()
    @ApiOperation({ operationId: 'CreateProject', summary: 'Create a project.' })
    @ApiCreatedResponse({ description: 'The project was created.', type: ProjectResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    async create(
        @Body(new ZodValidationPipe(createProjectSchema)) createProjectDto: CreateProjectDto,
    ): Promise<ProjectResponseDto> {
        return this.projectsService.create(createProjectDto);
    }

    @Patch(':id')
    @ApiOperation({ operationId: 'updateProject', summary: 'Rename a project.' })
    @ApiOkResponse({ description: 'The project was renamed.', type: ProjectResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async update(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateProjectSchema)) updateProjectDto: UpdateProjectDto,
    ): Promise<ProjectResponseDto> {
        return this.projectsService.update(id, updateProjectDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ operationId: 'deleteProject', summary: 'Delete a project.' })
    @ApiNoContentResponse({ description: 'The project was deleted.' })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async delete(@Param('id') id: string): Promise<void> {
        await this.projectsService.delete(id);
    }
}
