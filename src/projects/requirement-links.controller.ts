import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { ProjectAuthorizationGuard } from '@/auth/authorization/project-authorization.guard';
import { ProjectPermission, RequireProjectPermission } from '@/auth/authorization/project-permission';
import { SessionAuthGuard } from '@/auth/sessions/session-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import {
    CreateRequirementLinkDto,
    RequirementLinkResponseDto,
    RequirementLinksOverviewDto,
    UpdateRequirementLinkDto,
} from '@/projects/dto/requirement-link.dto';
import { createRequirementLinkSchema, updateRequirementLinkSchema } from '@/projects/dto/requirement-link.schemas';
import { RequirementLinksService } from '@/projects/requirement-links.service';

@ApiTags('requirement-links')
@ApiBearerAuth()
@Controller('projects/:projectId/requirements/:requirementId/links')
@UseGuards(SessionAuthGuard, ProjectAuthorizationGuard)
export class RequirementLinksController {
    constructor(private readonly links: RequirementLinksService) {}

    @Get()
    @RequireProjectPermission(ProjectPermission.Read)
    @ApiOperation({ operationId: 'getRequirementLinks', summary: 'List incoming and outgoing links for a requirement.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Selected requirement identifier.' })
    @ApiOkResponse({ type: RequirementLinksOverviewDto })
    @ApiNotFoundResponse({ description: 'The project requirement was not found.' })
    overview(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
    ): Promise<RequirementLinksOverviewDto> {
        return this.links.overview(projectId, requirementId);
    }

    @Post()
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({ operationId: 'createRequirementLink', summary: 'Create a references link to a target requirement key.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Source requirement identifier.' })
    @ApiCreatedResponse({ type: RequirementLinkResponseDto })
    @ApiBadRequestResponse({ description: 'The link is a duplicate, self-link, or invalid.' })
    @ApiNotFoundResponse({ description: 'The source or target requirement was not found.' })
    create(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Body(new ZodValidationPipe(createRequirementLinkSchema)) body: CreateRequirementLinkDto,
    ): Promise<RequirementLinkResponseDto> {
        return this.links.create(projectId, requirementId, body.targetKey);
    }

    @Patch(':linkId')
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({ operationId: 'updateRequirementLink', summary: 'Correct the target of an existing requirement link.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Source requirement identifier.' })
    @ApiParam({ name: 'linkId', description: 'Requirement-link identifier.' })
    @ApiOkResponse({ type: RequirementLinkResponseDto })
    @ApiBadRequestResponse({ description: 'The corrected link is a duplicate, self-link, or invalid.' })
    @ApiNotFoundResponse({ description: 'The link or target requirement was not found.' })
    update(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Param('linkId') linkId: string,
        @Body(new ZodValidationPipe(updateRequirementLinkSchema)) body: UpdateRequirementLinkDto,
    ): Promise<RequirementLinkResponseDto> {
        return this.links.update(projectId, requirementId, linkId, body.targetKey);
    }

    @Delete(':linkId')
    @HttpCode(204)
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({ operationId: 'deleteRequirementLink', summary: 'Remove an existing requirement link.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Source requirement identifier.' })
    @ApiParam({ name: 'linkId', description: 'Requirement-link identifier.' })
    @ApiNoContentResponse({ description: 'The link was removed.' })
    @ApiNotFoundResponse({ description: 'The link was not found.' })
    async remove(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Param('linkId') linkId: string,
    ): Promise<void> {
        await this.links.remove(projectId, requirementId, linkId);
    }
}
