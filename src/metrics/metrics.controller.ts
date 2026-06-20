import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { CreateMetricDto } from '@/metrics/dto/create-metric.dto';
import { MetricResponseDto } from '@/metrics/dto/metric-response.dto';
import { MetricsService } from '@/metrics/metrics.service';
@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}
    @Post()
    @ApiOperation({ summary: 'Create a project-scoped metric.' })
    @ApiCreatedResponse({ type: MetricResponseDto })
    @ApiBadRequestResponse({ description: 'Malformed metric input.' })
    @ApiNotFoundResponse({ description: 'Project not found.' })
    @ApiConflictResponse({ description: 'Duplicate project metric key.' })
    create(@Body() dto: CreateMetricDto): Promise<MetricResponseDto> {
        return this.metricsService.create(dto);
    }
    @Get()
    @ApiOperation({ summary: 'List metrics by project.' })
    @ApiQuery({ name: 'projectId', required: true })
    @ApiOkResponse({ type: [MetricResponseDto] })
    findAll(@Query('projectId') projectId: string): Promise<MetricResponseDto[]> {
        return this.metricsService.findAll(projectId);
    }
    @Get('key/:key')
    @ApiOperation({ summary: 'Retrieve a metric by key within a project.' })
    @ApiParam({ name: 'key', example: 'MET-0001' })
    @ApiQuery({ name: 'projectId', required: true })
    findByKey(@Param('key') key: string, @Query('projectId') projectId: string): Promise<MetricResponseDto> {
        return this.metricsService.findByKey(projectId, key);
    }
    @Get(':id') @ApiOperation({ summary: 'Retrieve a metric by UUID.' }) findOne(
        @Param('id') id: string,
    ): Promise<MetricResponseDto> {
        return this.metricsService.findOne(id);
    }
}
