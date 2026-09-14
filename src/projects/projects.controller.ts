import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { ProjectResponseDto } from "@/projects/dto/project-response.dto";
import { ProjectsService } from "@/projects/projects.service";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { ProjectAuthorizationGuard } from "@/auth/authorization/project-authorization.guard";
import {
  ProjectPermission,
  RequireProjectPermission,
} from "@/auth/authorization/project-permission";
import type { AuthenticatedRequest } from "@/auth/sessions/authenticated-request";
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
  @RequireProjectPermission(ProjectPermission.ReadProject)
  @ApiOperation({ operationId: "listProjects", summary: "List all projects." })
  @ApiOkResponse({
    description: "All projects.",
    type: ProjectResponseDto,
    isArray: true,
  })
  async findAll(
    @Req() request: AuthenticatedRequest,
  ): Promise<ProjectResponseDto[]> {
    const ids = await this.memberships.projectIdsForUser(
      request.authentication.user.id,
    );
    return this.projectsService.findAll(ids);
  }

  @Get(":id")
  @RequireProjectPermission(ProjectPermission.ReadProject)
  @ApiOperation({ operationId: "getProject", summary: "Get one project." })
  @ApiParam({ name: "id", description: "Project identifier." })
  @ApiOkResponse({ description: "The project.", type: ProjectResponseDto })
  @ApiNotFoundResponse({ description: "The project was not found." })
  async findOne(@Param("id") id: string): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id);
  }
}
