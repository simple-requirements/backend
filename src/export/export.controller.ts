import { Controller, Get, Param, ParseUUIDPipe, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';

import type { AuthenticatedRequest } from '@/auth/sessions/authenticated-request';
import { SessionAuthGuard } from '@/auth/sessions/session-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { ExportFormatResponseDto } from '@/export/dto/export-format-response.dto';
import { ExportService } from '@/export/export.service';
import {
    exportFormatQuerySchema,
    requirementSelectionExportQuerySchema,
    type ExportFormatQuery,
    type RequirementSelectionExportQuery,
} from '@/export/export.schemas';
import { OperationalExportGuard } from '@/export/operational-export.guard';

@ApiTags('export')
@Controller('export')
export class ExportController {
    constructor(private readonly exportService: ExportService) {}

    @Get('formats')
    @UseGuards(SessionAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ operationId: 'listExportFormats', summary: 'List supported export formats and capabilities.' })
    @ApiOkResponse({ type: ExportFormatResponseDto, isArray: true })
    formats(): ExportFormatResponseDto[] {
        return this.exportService.formats();
    }

    @Get('projects')
    @UseGuards(OperationalExportGuard)
    @ApiOperation({ operationId: 'exportAllProjects', summary: 'Operational export of all projects and content.' })
    @ApiHeader({ name: 'X-Operational-Export-Secret', required: true })
    @ApiQuery({ name: 'format', required: false, example: 'json' })
    @ApiProduces('application/json', 'text/markdown', 'text/asciidoc')
    @ApiOkResponse({ description: 'Export file.' })
    @ApiForbiddenResponse({ description: 'Operational export access is not permitted.' })
    @ApiBadRequestResponse({ description: 'The export format is unsupported.' })
    async allProjects(
        @Query(new ZodValidationPipe(exportFormatQuerySchema)) query: ExportFormatQuery,
    ): Promise<StreamableFile> {
        return this.asFile(await this.exportService.allProjects(query.format));
    }

    @Get('projects/:projectId')
    @UseGuards(SessionAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ operationId: 'exportProject', summary: 'Export one project with complete exportable content.' })
    @ApiParam({ name: 'projectId', description: 'Project UUID.' })
    @ApiQuery({ name: 'format', required: false, example: 'json' })
    @ApiProduces('application/json', 'text/markdown', 'text/asciidoc')
    @ApiOkResponse({ description: 'Export file.' })
    @ApiForbiddenResponse({ description: 'Project export access is not permitted.' })
    @ApiNotFoundResponse({ description: 'The project was not found.' })
    @ApiBadRequestResponse({ description: 'The export format is unsupported.' })
    async project(
        @Param('projectId', new ParseUUIDPipe()) projectId: string,
        @Query(new ZodValidationPipe(exportFormatQuerySchema)) query: ExportFormatQuery,
        @Req() request: AuthenticatedRequest,
    ): Promise<StreamableFile> {
        return this.asFile(await this.exportService.project(projectId, query.format, {
            userId: request.authentication.user.id,
            role: request.authentication.role,
        }));
    }

    @Get('requirements')
    @UseGuards(SessionAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ operationId: 'exportRequirements', summary: 'Export selected requirements grouped by project.' })
    @ApiQuery({ name: 'id', required: true, description: 'Comma-separated requirement UUIDs.' })
    @ApiQuery({ name: 'format', required: false, example: 'json' })
    @ApiProduces('application/json', 'text/markdown', 'text/asciidoc')
    @ApiOkResponse({ description: 'Export file.' })
    @ApiForbiddenResponse({ description: 'Requirement-selection export access is not permitted.' })
    @ApiNotFoundResponse({ description: 'A selected requirement was not found.' })
    @ApiBadRequestResponse({ description: 'Selectors are invalid or the export format is unsupported.' })
    async requirements(
        @Query(new ZodValidationPipe(requirementSelectionExportQuerySchema)) query: RequirementSelectionExportQuery,
        @Req() request: AuthenticatedRequest,
    ): Promise<StreamableFile> {
        return this.asFile(
            await this.exportService.requirements(query.id, query.format, {
                userId: request.authentication.user.id,
                role: request.authentication.role,
            }),
        );
    }

    private asFile(rendered: { content: string; mediaType: string; filename: string }): StreamableFile {
        return new StreamableFile(Buffer.from(rendered.content, 'utf8'), {
            type: rendered.mediaType,
            disposition: `attachment; filename="${rendered.filename}"`,
        });
    }
}
