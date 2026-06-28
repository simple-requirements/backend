import { Body, Controller, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { ProjectResponseDto } from '@/projects/dto/project-response.dto';
import { ProjectsService } from '@/projects/projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a project.' })
    @ApiCreatedResponse({ description: 'The project was created.', type: ProjectResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    async create(@Body() createProjectDto: CreateProjectDto): Promise<ProjectResponseDto> {
        return this.projectsService.create(createProjectDto);
    }
}
