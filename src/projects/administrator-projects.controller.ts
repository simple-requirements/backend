import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { AdministratorGuard } from "@/auth/authorization/administrator.guard";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { AdministratorProjectsService } from "@/projects/administrator-projects.service";
import { AdministratorProjectSummaryResponseDto } from "@/projects/dto/administrator-project-summary-response.dto";
import { CreateProjectDto } from "@/projects/dto/create-project.dto";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/projects/dto/project.schemas";
import { UpdateProjectDto } from "@/projects/dto/update-project.dto";

@ApiTags("project administration")
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, AdministratorGuard)
@Controller("admin/projects")
export class AdministratorProjectsController {
  constructor(private readonly projects: AdministratorProjectsService) {}

  @Get()
  @ApiOperation({
    operationId: "adminListProjects",
    summary: "List projects as administrative summaries.",
  })
  @ApiOkResponse({
    type: AdministratorProjectSummaryResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Administrator access is required." })
  list(): Promise<AdministratorProjectSummaryResponseDto[]> {
    return this.projects.list();
  }

  @Get(":projectId")
  @ApiOperation({
    operationId: "adminGetProject",
    summary: "Get one administrative project summary.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiOkResponse({ type: AdministratorProjectSummaryResponseDto })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Administrator access is required." })
  @ApiNotFoundResponse({ description: "The project was not found." })
  find(
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ): Promise<AdministratorProjectSummaryResponseDto> {
    return this.projects.find(projectId);
  }

  @Post()
  @ApiOperation({
    operationId: "adminCreateProject",
    summary: "Create a project.",
  })
  @ApiCreatedResponse({ type: AdministratorProjectSummaryResponseDto })
  @ApiBadRequestResponse({ description: "The request body is invalid." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Administrator access is required." })
  create(
    @Body(new ZodValidationPipe(createProjectSchema))
    createProjectDto: CreateProjectDto,
  ): Promise<AdministratorProjectSummaryResponseDto> {
    return this.projects.create(createProjectDto);
  }

  @Patch(":projectId")
  @ApiOperation({
    operationId: "adminUpdateProject",
    summary: "Update project administration settings.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiOkResponse({ type: AdministratorProjectSummaryResponseDto })
  @ApiBadRequestResponse({ description: "The request body is invalid." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Administrator access is required." })
  @ApiNotFoundResponse({ description: "The project was not found." })
  update(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body(new ZodValidationPipe(updateProjectSchema))
    updateProjectDto: UpdateProjectDto,
  ): Promise<AdministratorProjectSummaryResponseDto> {
    return this.projects.update(projectId, updateProjectDto);
  }

  @Delete(":projectId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: "adminDeleteProject",
    summary: "Delete a project.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiNoContentResponse({ description: "The empty project was deleted." })
  @ApiBadRequestResponse({
    description: "The project contains requirements and must be retained.",
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Administrator access is required." })
  @ApiNotFoundResponse({ description: "The project was not found." })
  delete(@Param("projectId", ParseUUIDPipe) projectId: string): Promise<void> {
    return this.projects.delete(projectId);
  }
}
