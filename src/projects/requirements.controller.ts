import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { CreateRequirementDto } from "@/projects/dto/create-requirement.dto";
import { RequirementResponseDto } from "@/projects/dto/requirement-response.dto";
import {
  createRequirementSchema,
  updateRequirementSchema,
} from "@/projects/dto/project.schemas";
import { UpdateRequirementDto } from "@/projects/dto/update-requirement.dto";
import { ProjectsService } from "@/projects/projects.service";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { ProjectAuthorizationGuard } from "@/auth/authorization/project-authorization.guard";
import {
  ProjectPermission,
  RequireProjectPermission,
} from "@/auth/authorization/project-permission";
import type { AuthenticatedRequest } from "@/auth/sessions/authenticated-request";
import { RequirementStatus } from "@/projects/requirement-status.enum";
import { revisionActorFromAuthenticatedUser } from "@/projects/requirements/requirement-revision-metadata";

@ApiTags("requirements")
@ApiBearerAuth()
@Controller("projects/:projectId/requirements")
@UseGuards(SessionAuthGuard, ProjectAuthorizationGuard)
export class RequirementsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequireProjectPermission(ProjectPermission.Read)
  @ApiOperation({
    operationId: "listRequirements",
    summary: "List all requirements of a project.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiOkResponse({
    description: "All requirements of the project.",
    type: RequirementResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: "The project was not found." })
  async findAllRequirements(
    @Param("projectId") projectId: string,
  ): Promise<RequirementResponseDto[]> {
    return this.projectsService.findAllRequirements(projectId);
  }


  @Get(":requirementId/revisions")
  @RequireProjectPermission(ProjectPermission.Read)
  @ApiOperation({
    operationId: "listRequirementRevisions",
    summary: "List immutable requirement revisions including the current revision.",
  })
  @ApiOkResponse({
    description: "Requirement revisions from 1..N including the current revision.",
    type: RequirementResponseDto,
    isArray: true,
  })
  async findRequirementRevisions(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
  ): Promise<RequirementResponseDto[]> {
    return this.projectsService.findRequirementRevisions(
      projectId,
      requirementId,
    );
  }

  @Get(":requirementId/revisions/compare")
  @RequireProjectPermission(ProjectPermission.Read)
  @ApiOperation({
    operationId: "compareRequirementRevisions",
    summary: "Compare two requirement revisions.",
  })
  async compareRequirementRevisions(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Query("from") fromRevision: string,
    @Query("to") toRevision: string,
  ) {
    return this.projectsService.compareRequirementRevisions(
      projectId,
      requirementId,
      Number(fromRevision),
      Number(toRevision),
    );
  }

  @Get(":requirementId")
  @RequireProjectPermission(ProjectPermission.Read)
  @ApiOperation({
    operationId: "getRequirement",
    summary: "Get one requirement.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiParam({ name: "requirementId", description: "Requirement identifier." })
  @ApiOkResponse({
    description: "The current requirement.",
    type: RequirementResponseDto,
  })
  @ApiNotFoundResponse({
    description: "The project or requirement was not found.",
  })
  async findRequirement(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
  ): Promise<RequirementResponseDto> {
    return this.projectsService.findRequirement(projectId, requirementId);
  }

  @Post()
  @RequireProjectPermission(ProjectPermission.ManageRequirements)
  @ApiOperation({
    operationId: "createRequirement",
    summary: "Create a draft requirement for a project.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiCreatedResponse({
    description: "The draft requirement was created.",
    type: RequirementResponseDto,
  })
  @ApiBadRequestResponse({ description: "The request body is invalid." })
  @ApiNotFoundResponse({
    description: "The project or category was not found.",
  })
  async createRequirement(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(createRequirementSchema))
    createRequirementDto: CreateRequirementDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RequirementResponseDto> {
    return this.projectsService.createRequirement(
      projectId,
      createRequirementDto,
      revisionActorFromAuthenticatedUser(request.authentication.user),
    );
  }

  @Patch(":requirementId")
  @RequireProjectPermission(ProjectPermission.ManageRequirements)
  @ApiOperation({
    operationId: "updateRequirement",
    summary: "Update a requirement.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiParam({ name: "requirementId", description: "Requirement identifier." })
  @ApiOkResponse({
    description: "The requirement was updated.",
    type: RequirementResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      "The request body is invalid or the status transition is not allowed.",
  })
  @ApiNotFoundResponse({
    description: "The project, category, or requirement was not found.",
  })
  async updateRequirement(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Body(new ZodValidationPipe(updateRequirementSchema))
    updateRequirementDto: UpdateRequirementDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RequirementResponseDto> {
    const trustedUpdate = updateRequirementDto;
    if (
      trustedUpdate.status === RequirementStatus.Approved ||
      trustedUpdate.status === RequirementStatus.Rejected
    )
      trustedUpdate.reviewer = request.authentication.user.displayName;
    if (trustedUpdate.status === RequirementStatus.Obsolete)
      trustedUpdate.obsoletedBy = request.authentication.user.displayName;
    return this.projectsService.updateRequirement(
      projectId,
      requirementId,
      trustedUpdate,
      revisionActorFromAuthenticatedUser(request.authentication.user),
    );
  }

}
