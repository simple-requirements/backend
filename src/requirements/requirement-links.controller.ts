import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
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
