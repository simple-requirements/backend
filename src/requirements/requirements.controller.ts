import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';

import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { MarkObsoleteRequirementDto } from '@/requirements/dto/mark-obsolete-requirement.dto';
import type { RejectRequirementDto } from '@/requirements/dto/reject-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import type { RequirementRevisionResponseDto } from '@/requirements/dto/requirement-revision-response.dto';
import type { UpdateRequirementDto } from '@/requirements/dto/update-requirement.dto';
import type { RequirementListQueryDto } from '@/requirements/requirements-query.dto';
import { RequirementsService } from '@/requirements/requirements.service';

/**
 * HTTP boundary for requirement creation, lookup, lifecycle transitions, and revision history.
 *
 * Business rules, transactions, and response mapping stay in RequirementsService;
 * this class only binds HTTP inputs and declares route metadata.
 */
@ApiTags('requirements')
@Controller('requirements')
export class RequirementsController {
    constructor(private readonly requirementsService: RequirementsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a draft requirement.' })
    @ApiBody({ description: 'Requirement fields used to allocate a visible key and create draft content.' })
    @ApiCreatedResponse({ description: 'Requirement created.' })
    @ApiBadRequestResponse({ description: 'Malformed requirement input.' })
    @ApiNotFoundResponse({ description: 'Category was not found.' })
    @ApiConflictResponse({ description: 'Visible-key allocation conflict.' })
    async create(@Body() createRequirementDto: CreateRequirementDto): Promise<RequirementResponseDto> {
        return this.requirementsService.create(createRequirementDto);
    }

    @Get()
    @ApiOperation({ summary: 'List requirements with optional filters.' })
    @ApiQuery({ name: 'includeRejected', required: false })
    @ApiQuery({ name: 'type', required: false })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'owner', required: false })
    @ApiOkResponse({ description: 'Requirements ordered by visible key.' })
    @ApiBadRequestResponse({ description: 'Invalid filter value.' })
    async findAll(@Query() query: RequirementListQueryDto): Promise<RequirementResponseDto[]> {
        return this.requirementsService.findAll(query);
    }

    @Get('key/:visibleKey')
    @ApiOperation({ summary: 'Retrieve a requirement by visible key.' })
    @ApiParam({ name: 'visibleKey', example: 'NFR-PERF-0001' })
    @ApiOkResponse({ description: 'Requirement found.' })
    @ApiBadRequestResponse({ description: 'Invalid visible-key format.' })
    @ApiNotFoundResponse({ description: 'Requirement was not found.' })
    async findByVisibleKey(@Param('visibleKey') visibleKey: string): Promise<RequirementResponseDto> {
        return this.requirementsService.findByVisibleKey(visibleKey);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Retrieve a requirement by internal UUID.' })
    @ApiParam({ name: 'id' })
    @ApiOkResponse({ description: 'Requirement found.' })
    @ApiBadRequestResponse({ description: 'Invalid UUID.' })
    @ApiNotFoundResponse({ description: 'Requirement was not found.' })
    async findOne(@Param('id') id: string): Promise<RequirementResponseDto> {
        return this.requirementsService.findOne(id);
    }

    @Get(':id/revisions')
    @ApiOperation({ summary: 'List requirement revision snapshots.' })
    @ApiParam({ name: 'id' })
    @ApiOkResponse({ description: 'Revision snapshots ordered by revision number.' })
    @ApiBadRequestResponse({ description: 'Invalid UUID.' })
    @ApiNotFoundResponse({ description: 'Requirement was not found.' })
    async findRevisionHistory(@Param('id') id: string): Promise<RequirementRevisionResponseDto[]> {
        return this.requirementsService.findRevisionHistory(id);
    }

    @Get(':id/revisions/:revisionNumber')
    @ApiOperation({ summary: 'Retrieve one requirement revision snapshot.' })
    @ApiParam({ name: 'id' })
    @ApiParam({ name: 'revisionNumber' })
    @ApiOkResponse({ description: 'Revision snapshot found.' })
    @ApiBadRequestResponse({ description: 'Invalid UUID or revision number.' })
    @ApiNotFoundResponse({ description: 'Requirement or revision was not found.' })
    async findRevision(
        @Param('id') id: string,
        @Param('revisionNumber', ParseIntPipe) revisionNumber: number,
    ): Promise<RequirementRevisionResponseDto> {
        return this.requirementsService.findRevision(id, revisionNumber);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update editable draft requirement fields.' })
    @ApiParam({ name: 'id' })
    @ApiBody({ description: 'Editable requirement fields.' })
    @ApiOkResponse({ description: 'Requirement updated.' })
    @ApiBadRequestResponse({ description: 'Malformed update input.' })
    @ApiNotFoundResponse({ description: 'Requirement was not found.' })
    @ApiConflictResponse({ description: 'Requirement is not editable in its current state.' })
    async update(
        @Param('id') id: string,
        @Body() updateRequirementDto: UpdateRequirementDto,
    ): Promise<RequirementResponseDto> {
        return this.requirementsService.update(id, updateRequirementDto);
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: 'Reject a draft requirement.' })
    @ApiParam({ name: 'id' })
    @ApiBody({ description: 'Rejection reason and reviewer.' })
    @ApiOkResponse({ description: 'Requirement rejected.' })
    @ApiBadRequestResponse({ description: 'Malformed rejection input.' })
    @ApiNotFoundResponse({ description: 'Requirement was not found.' })
    @ApiConflictResponse({ description: 'Requirement cannot be rejected in its current state.' })
    async reject(
        @Param('id') id: string,
        @Body() rejectRequirementDto: RejectRequirementDto,
    ): Promise<RequirementResponseDto> {
        return this.requirementsService.reject(id, rejectRequirementDto);
    }

    @Patch(':id/approve')
    async approve(@Param('id') id: string): Promise<RequirementResponseDto> {
        return this.requirementsService.approve(id);
    }

    @Patch(':id/implemented')
    async markImplemented(@Param('id') id: string): Promise<RequirementResponseDto> {
        return this.requirementsService.markImplemented(id);
    }

    @Patch(':id/obsolete')
    async markObsolete(
        @Param('id') id: string,
        @Body() markObsoleteRequirementDto: MarkObsoleteRequirementDto,
    ): Promise<RequirementResponseDto> {
        return this.requirementsService.markObsolete(id, markObsoleteRequirementDto);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: 'Soft-delete a draft requirement.' })
    @ApiParam({ name: 'id' })
    @ApiOkResponse({ description: 'Requirement deleted.' })
    @ApiBadRequestResponse({ description: 'Invalid UUID.' })
    @ApiNotFoundResponse({ description: 'Requirement was not found.' })
    @ApiConflictResponse({ description: 'Requirement cannot be deleted in its current state.' })
    async delete(@Param('id') id: string): Promise<void> {
        await this.requirementsService.delete(id);
    }
}
