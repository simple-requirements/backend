import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
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
import { CreateMetricDto } from '@/projects/dto/create-metric.dto';
import { MetricResponseDto } from '@/projects/dto/metric-response.dto';
import { createMetricSchema, updateMetricSchema } from '@/projects/dto/project.schemas';
import { UpdateMetricDto } from '@/projects/dto/update-metric.dto';
import { MetricsService } from '@/projects/metrics.service';

@ApiTags('metrics')
@ApiBearerAuth()
@Controller('projects/:projectId/metrics')
@UseGuards(SessionAuthGuard, ProjectAuthorizationGuard)
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get()
    @RequireProjectPermission(ProjectPermission.Read)
    @ApiOperation({ operationId: 'listMetrics', summary: 'List all metrics of a project.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiOkResponse({ type: MetricResponseDto, isArray: true })
    @ApiForbiddenResponse({ description: 'Project access is not permitted.' })
    async list(@Param('projectId') projectId: string): Promise<MetricResponseDto[]> {
        return this.metricsService.list(projectId);
    }

    @Get(':metricId')
    @RequireProjectPermission(ProjectPermission.Read)
    @ApiOperation({ operationId: 'getMetric', summary: 'Get one metric.' })
    @ApiParam({ name: 'projectId' })
    @ApiParam({ name: 'metricId' })
    @ApiOkResponse({ type: MetricResponseDto })
    @ApiNotFoundResponse({ description: 'Metric was not found.' })
    async get(@Param('projectId') projectId: string, @Param('metricId') metricId: string): Promise<MetricResponseDto> {
        return this.metricsService.get(projectId, metricId);
    }

    @Post()
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({ operationId: 'createMetric', summary: 'Create a project metric.' })
    @ApiCreatedResponse({ type: MetricResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    async create(
        @Param('projectId') projectId: string,
        @Body(new ZodValidationPipe(createMetricSchema)) input: CreateMetricDto,
    ): Promise<MetricResponseDto> {
        return this.metricsService.create(projectId, input);
    }

    @Patch(':metricId')
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({ operationId: 'updateMetric', summary: 'Update a metric value or description.' })
    @ApiOkResponse({ type: MetricResponseDto })
    async update(
        @Param('projectId') projectId: string,
        @Param('metricId') metricId: string,
        @Body(new ZodValidationPipe(updateMetricSchema)) input: UpdateMetricDto,
    ): Promise<MetricResponseDto> {
        return this.metricsService.update(projectId, metricId, input);
    }

    @Post(':metricId/deactivate')
    @HttpCode(HttpStatus.OK)
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({ operationId: 'deactivateMetric', summary: 'Deactivate a metric without deleting it.' })
    @ApiOkResponse({ type: MetricResponseDto })
    async deactivate(
        @Param('projectId') projectId: string,
        @Param('metricId') metricId: string,
    ): Promise<MetricResponseDto> {
        return this.metricsService.deactivate(projectId, metricId);
    }
}
