import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { ProjectResponseDto } from '@/projects/dto/project-response.dto';
import { ProjectsService } from '@/projects/projects.service';

/** HTTP boundary for project creation and lookup. */
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a project.' })
    @ApiBody({ type: CreateProjectDto })
    @ApiCreatedResponse({ description: 'Project created.', type: ProjectResponseDto })
    @ApiBadRequestResponse({ description: 'Malformed project input.' })
    async create(@Body() createProjectDto: CreateProjectDto): Promise<ProjectResponseDto> {
        return this.projectsService.create(createProjectDto);
    }

    @Get()
    @ApiOperation({ summary: 'List projects with non-deleted requirement counts.' })
    @ApiOkResponse({ description: 'Projects ordered by creation time.', type: ProjectResponseDto, isArray: true })
    async findAll(): Promise<ProjectResponseDto[]> {
        return this.projectsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Retrieve a project by UUID.' })
    @ApiParam({ name: 'id' })
    @ApiOkResponse({ description: 'Project found.', type: ProjectResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid UUID.' })
    @ApiNotFoundResponse({ description: 'Project was not found.' })
    async findOne(@Param('id') id: string): Promise<ProjectResponseDto> {
        return this.projectsService.findOne(id);
    }
}
