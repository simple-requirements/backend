import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { ProjectResponseDto } from '@/projects/dto/project-response.dto';
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

    @Post()
    @ApiOperation({ operationId: 'CreateProject', summary: 'Create a project.' })
    @ApiCreatedResponse({ description: 'The project was created.', type: ProjectResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    async create(@Body() createProjectDto: CreateProjectDto): Promise<ProjectResponseDto> {
        return this.projectsService.create(createProjectDto);
    }

    @Patch(':id')
    @ApiOperation({ operationId: 'renameProject', summary: 'Rename a project.' })
    @ApiOkResponse({ description: 'The project was renamed.', type: ProjectResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto): Promise<ProjectResponseDto> {
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
