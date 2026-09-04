import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { CreateProjectDto } from "@/projects/dto/create-project.dto";
import { ProjectResponseDto } from "@/projects/dto/project-response.dto";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/projects/dto/project.schemas";
import { UpdateProjectDto } from "@/projects/dto/update-project.dto";
import { ProjectsService } from "@/projects/projects.service";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { ProjectAuthorizationGuard } from "@/auth/authorization/project-authorization.guard";
import {
  ProjectPermission,
  RequireProjectPermission,
} from "@/auth/authorization/project-permission";
import type { AuthenticatedRequest } from "@/auth/sessions/authenticated-request";
import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { ProjectMembershipService } from "@/auth/authorization/project-membership.service";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
@UseGuards(SessionAuthGuard, ProjectAuthorizationGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly memberships: ProjectMembershipService,
  ) {}

  @Get()
  @RequireProjectPermission(ProjectPermission.Read)
  @ApiOperation({ operationId: "listProjects", summary: "List all projects." })
  @ApiOkResponse({
    description: "All projects.",
    type: ProjectResponseDto,
    isArray: true,
  })
  async findAll(
    @Req() request: AuthenticatedRequest,
  ): Promise<ProjectResponseDto[]> {
    const ids = request.authentication.globalRoles.includes(
      GlobalRole.Administrator,
    )
      ? undefined
      : await this.memberships.projectIdsForUser(
          request.authentication.user.id,
        );
    return this.projectsService.findAll(ids);
  }

  @Get(":id")
  @RequireProjectPermission(ProjectPermission.Read)
  @ApiOperation({ operationId: "getProject", summary: "Get one project." })
  @ApiParam({ name: "id", description: "Project identifier." })
  @ApiOkResponse({ description: "The project.", type: ProjectResponseDto })
  @ApiNotFoundResponse({ description: "The project was not found." })
  async findOne(@Param("id") id: string): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id);
  }

  @Post()
  @RequireProjectPermission(ProjectPermission.Administer)
  @ApiOperation({ operationId: "CreateProject", summary: "Create a project." })
  @ApiCreatedResponse({
    description: "The project was created.",
    type: ProjectResponseDto,
  })
  @ApiBadRequestResponse({ description: "The request body is invalid." })
  async create(
    @Body(new ZodValidationPipe(createProjectSchema))
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(createProjectDto);
  }

  @Patch(":id")
  @RequireProjectPermission(ProjectPermission.Administer)
  @ApiOperation({ operationId: "updateProject", summary: "Rename a project." })
  @ApiOkResponse({
    description: "The project was renamed.",
    type: ProjectResponseDto,
  })
  @ApiBadRequestResponse({ description: "The request body is invalid." })
  @ApiNotFoundResponse({ description: "The project was not found." })
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProjectSchema))
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(":id")
  @RequireProjectPermission(ProjectPermission.Administer)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: "deleteProject", summary: "Delete a project." })
  @ApiNoContentResponse({ description: "The project was deleted." })
  @ApiNotFoundResponse({ description: "The project was not found." })
  async delete(@Param("id") id: string): Promise<void> {
    await this.projectsService.delete(id);
  }
}
