import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { RequirementLinkResponseDto, RequirementLinkTargetDto } from '@/requirements/dto/requirement-link.dto';
import {
    RequirementLinkChangesResponseDto,
    RequirementLinkHistoryResponseDto,
    RequirementRevisionLinksResponseDto,
} from '@/requirements/dto/requirement-link-history.dto';
import { RequirementLinksService } from '@/requirements/requirement-links.service';

@ApiTags('requirement-links')
@Controller()
export class RequirementLinksController {
    constructor(private readonly requirementLinksService: RequirementLinksService) {}

    @Post('requirements/:id/links')
    @ApiOperation({ summary: 'Create an explicit references link from one requirement to another.' })
    @ApiParam({ name: 'id', description: 'Source requirement UUID.' })
    @ApiBody({ type: RequirementLinkTargetDto })
    @ApiCreatedResponse({ description: 'Requirement link created.', type: RequirementLinkResponseDto })
    @ApiBadRequestResponse({
        description: 'Invalid UUID, selector, self-link, visible key format, or cross-project link.',
    })
    @ApiNotFoundResponse({ description: 'Source or target requirement was not found.' })
    @ApiConflictResponse({ description: 'Duplicate active references link.' })
    create(@Param('id') id: string, @Body() dto: RequirementLinkTargetDto): Promise<RequirementLinkResponseDto> {
        return this.requirementLinksService.create(id, dto);
    }

    @Get('requirements/:id/link-history')
    @ApiOperation({ summary: 'List auditable requirement link lifecycle events involving a requirement.' })
    @ApiOkResponse({ type: [RequirementLinkHistoryResponseDto] })
    @ApiBadRequestResponse({ description: 'Invalid UUID.' })
    @ApiNotFoundResponse({ description: 'Requirement was not found.' })
    listHistory(@Param('id') id: string): Promise<RequirementLinkHistoryResponseDto[]> {
        return this.requirementLinksService.listHistory(id);
    }

    @Get('requirements/:id/revisions/:revisionNumber/links')
    @ApiOperation({ summary: 'List incoming and outgoing links active at a requirement revision timestamp.' })
    @ApiOkResponse({ type: RequirementRevisionLinksResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid UUID or revision number.' })
    @ApiNotFoundResponse({ description: 'Requirement or revision was not found.' })
    listRevisionLinks(
        @Param('id') id: string,
        @Param('revisionNumber', ParseIntPipe) revisionNumber: number,
    ): Promise<RequirementRevisionLinksResponseDto> {
        return this.requirementLinksService.listRevisionLinks(id, revisionNumber);
    }

    @Get('requirements/:id/link-changes')
    @ApiOperation({ summary: 'Compare requirement link state between two requirement revisions.' })
    @ApiOkResponse({ type: RequirementLinkChangesResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid or missing revision range.' })
    @ApiNotFoundResponse({ description: 'Requirement or revision was not found.' })
    listChanges(
        @Param('id') id: string,
        @Query('fromRevision', ParseIntPipe) fromRevision: number,
        @Query('toRevision', ParseIntPipe) toRevision: number,
    ): Promise<RequirementLinkChangesResponseDto> {
        return this.requirementLinksService.listChanges(id, fromRevision, toRevision);
    }

    @Get('requirements/:id/links/outgoing')
    @ApiOperation({ summary: 'List active outgoing requirement links.' })
    @ApiOkResponse({ type: [RequirementLinkResponseDto] })
    listOutgoing(@Param('id') id: string): Promise<RequirementLinkResponseDto[]> {
        return this.requirementLinksService.listOutgoing(id);
    }

    @Get('requirements/:id/links/incoming')
    @ApiOperation({ summary: 'List active incoming requirement links.' })
    @ApiOkResponse({ type: [RequirementLinkResponseDto] })
    listIncoming(@Param('id') id: string): Promise<RequirementLinkResponseDto[]> {
        return this.requirementLinksService.listIncoming(id);
    }

    @Get('projects/:projectId/requirement-links')
    @ApiOperation({ summary: 'List active requirement links for a project.' })
    @ApiOkResponse({ type: [RequirementLinkResponseDto] })
    listProject(@Param('projectId') projectId: string): Promise<RequirementLinkResponseDto[]> {
        return this.requirementLinksService.listProject(projectId);
    }

    @Patch('requirement-links/:linkId')
    @ApiOperation({ summary: 'Correct the target of an active requirement link.' })
    @ApiBody({ type: RequirementLinkTargetDto })
    @ApiOkResponse({ type: RequirementLinkResponseDto })
    @ApiBadRequestResponse({
        description: 'Invalid UUID, selector, self-link, visible key format, or cross-project link.',
    })
    @ApiNotFoundResponse({
        description: 'Requirement link or target requirement was not found, including removed links.',
    })
    @ApiConflictResponse({ description: 'Duplicate active references link.' })
    update(
        @Param('linkId') linkId: string,
        @Body() dto: RequirementLinkTargetDto,
    ): Promise<RequirementLinkResponseDto> {
        return this.requirementLinksService.update(linkId, dto);
    }

    @Delete('requirement-links/:linkId')
    @HttpCode(204)
    @ApiOperation({ summary: 'Remove an active requirement link.' })
    @ApiNoContentResponse({ description: 'Requirement link removed.' })
    @ApiNotFoundResponse({ description: 'Requirement link was not found or already removed.' })
    async remove(@Param('linkId') linkId: string): Promise<void> {
        await this.requirementLinksService.remove(linkId);
    }
}
