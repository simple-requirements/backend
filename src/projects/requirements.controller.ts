import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { CreateRequirementDto } from '@/projects/dto/create-requirement.dto';
import { RequirementResponseDto } from '@/projects/dto/requirement-response.dto';
import type { RequirementRevisionQueryDto } from '@/projects/dto/requirement-revision-query.dto';
import { createRequirementSchema, requirementRevisionQuerySchema, updateRequirementSchema } from '@/projects/dto/project.schemas';
import { UpdateRequirementDto } from '@/projects/dto/update-requirement.dto';
import { ProjectsService } from '@/projects/projects.service';

@ApiTags('requirements')
@Controller('projects/:projectId/requirements')
export class RequirementsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Get()
    @ApiOperation({ operationId: 'listRequirements', summary: 'List all requirements of a project.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiQuery({ name: 'deleted', required: false, description: 'Return requirements from the recycle bin.' })
    @ApiOkResponse({ description: 'All requirements of the project.', type: RequirementResponseDto, isArray: true })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async findAllRequirements(
        @Param('projectId') projectId: string,
        @Query('deleted') deleted?: string,
    ): Promise<RequirementResponseDto[]> {
        return this.projectsService.findAllRequirements(projectId, deleted !== undefined);
    }

    @Get(':requirementId')
    @ApiOperation({ operationId: 'getRequirement', summary: 'Get one requirement or one/all stored revisions.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Requirement identifier.' })
    @ApiQuery({ name: 'revision', required: false, type: Number, description: 'Return the requirement version with this revision number.' })
    @ApiQuery({ name: 'allrevisions', required: false, description: 'Return all stored historical revisions.' })
    @ApiOkResponse({ description: 'The requirement, one revision, or all historical revisions.', type: RequirementResponseDto })
    @ApiBadRequestResponse({ description: 'The revision query parameters are invalid.' })
    @ApiNotFoundResponse({ description: 'The project, requirement, or revision was not found.' })
    async findRequirement(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Query(new ZodValidationPipe(requirementRevisionQuerySchema)) revisionQuery: RequirementRevisionQueryDto,
    ): Promise<RequirementResponseDto | RequirementResponseDto[]> {
        return this.projectsService.findRequirement(projectId, requirementId, revisionQuery);
    }

    @Post()
    @ApiOperation({ operationId: 'createRequirement', summary: 'Create a draft requirement for a project.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiCreatedResponse({ description: 'The draft requirement was created.', type: RequirementResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    @ApiNotFoundResponse({ description: 'The project or category was not found.' })
    async createRequirement(
        @Param('projectId') projectId: string,
        @Body(new ZodValidationPipe(createRequirementSchema)) createRequirementDto: CreateRequirementDto,
    ): Promise<RequirementResponseDto> {
        return this.projectsService.createRequirement(projectId, createRequirementDto);
    }

    @Patch(':requirementId')
    @ApiOperation({ operationId: 'updateRequirement', summary: 'Update a requirement.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Requirement identifier.' })
    @ApiOkResponse({ description: 'The requirement was updated.', type: RequirementResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid or the status transition is not allowed.' })
    @ApiNotFoundResponse({ description: 'The project, category, or requirement was not found.' })
    async updateRequirement(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Body(new ZodValidationPipe(updateRequirementSchema)) updateRequirementDto: UpdateRequirementDto,
    ): Promise<RequirementResponseDto> {
        return this.projectsService.updateRequirement(projectId, requirementId, updateRequirementDto);
    }

    @Delete(':requirementId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ operationId: 'deleteRequirement', summary: 'Delete a requirement.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Requirement identifier.' })
    @ApiQuery({ name: 'deleted', required: false, description: 'Permanently remove a recycled requirement.' })
    @ApiNoContentResponse({ description: 'The requirement was deleted.' })
    @ApiBadRequestResponse({ description: 'The requirement cannot be deleted in its current state.' })
    @ApiNotFoundResponse({ description: 'The project or requirement was not found.' })
    async deleteRequirement(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Query('deleted') deleted?: string,
    ): Promise<void> {
        await this.projectsService.deleteRequirement(projectId, requirementId, deleted !== undefined);
    }

    @Delete()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ operationId: 'clearDeletedRequirements', summary: 'Clear the requirement recycle bin.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiQuery({ name: 'deleted', required: false, description: 'Required to clear the recycle bin.' })
    @ApiNoContentResponse({ description: 'The recycle bin was cleared.' })
    @ApiBadRequestResponse({ description: 'The deleted query parameter is required.' })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    async clearDeletedRequirements(
        @Param('projectId') projectId: string,
        @Query('deleted') deleted?: string,
    ): Promise<void> {
        await this.projectsService.clearDeletedRequirements(projectId, deleted !== undefined);
    }
}
