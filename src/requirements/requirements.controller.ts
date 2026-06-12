import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import type { CreateRequirementDto } from '@/requirements/dto/create-requirement.dto';
import type { RequirementResponseDto } from '@/requirements/dto/requirement-response.dto';
import { RequirementsService } from '@/requirements/requirements.service';

@Controller('requirements')
export class RequirementsController {
    constructor(private readonly requirementsService: RequirementsService) {}

    @Post()
    async create(@Body() createRequirementDto: CreateRequirementDto): Promise<RequirementResponseDto> {
        return this.requirementsService.create(createRequirementDto);
    }

    @Get()
    async findAll(): Promise<RequirementResponseDto[]> {
        return this.requirementsService.findAll();
    }

    @Get('key/:visibleKey')
    async findByVisibleKey(@Param('visibleKey') visibleKey: string): Promise<RequirementResponseDto> {
        return this.requirementsService.findByVisibleKey(visibleKey);
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<RequirementResponseDto> {
        return this.requirementsService.findOne(id);
    }
}
