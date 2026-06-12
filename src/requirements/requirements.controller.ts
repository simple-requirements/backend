import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';

import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { RejectRequirementDto } from '@/requirements/dto/reject-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import type { RequirementRevisionResponseDto } from '@/requirements/dto/requirement-revision-response.dto';
import type { UpdateRequirementDto } from '@/requirements/dto/update-requirement.dto';
import { RequirementsService } from '@/requirements/requirements.service';

@Controller('requirements')
export class RequirementsController {
    constructor(private readonly requirementsService: RequirementsService) {}

    @Post()
    async create(@Body() createRequirementDto: CreateRequirementDto): Promise<RequirementResponseDto> {
        return this.requirementsService.create(createRequirementDto);
    }

    @Get()
    async findAll(@Query('includeRejected') includeRejected?: string): Promise<RequirementResponseDto[]> {
        return this.requirementsService.findAll(includeRejected === 'true');
    }

    @Get('key/:visibleKey')
    async findByVisibleKey(@Param('visibleKey') visibleKey: string): Promise<RequirementResponseDto> {
        return this.requirementsService.findByVisibleKey(visibleKey);
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<RequirementResponseDto> {
        return this.requirementsService.findOne(id);
    }

    @Get(':id/revisions')
    async findRevisionHistory(@Param('id') id: string): Promise<RequirementRevisionResponseDto[]> {
        return this.requirementsService.findRevisionHistory(id);
    }

    @Get(':id/revisions/:revisionNumber')
    async findRevision(
        @Param('id') id: string,
        @Param('revisionNumber', ParseIntPipe) revisionNumber: number,
    ): Promise<RequirementRevisionResponseDto> {
        return this.requirementsService.findRevision(id, revisionNumber);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateRequirementDto: UpdateRequirementDto,
    ): Promise<RequirementResponseDto> {
        return this.requirementsService.update(id, updateRequirementDto);
    }

    @Patch(':id/reject')
    async reject(
        @Param('id') id: string,
        @Body() rejectRequirementDto: RejectRequirementDto,
    ): Promise<RequirementResponseDto> {
        return this.requirementsService.reject(id, rejectRequirementDto);
    }

    @Delete(':id')
    @HttpCode(204)
    async delete(@Param('id') id: string): Promise<void> {
        await this.requirementsService.delete(id);
    }
}
