import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
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
import { ProjectMembershipService } from "@/auth/authorization/project-membership.service";
import { ProjectMembershipResponseDto } from "@/auth/dto/project-membership-response.dto";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";

@ApiTags("project memberships")
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, AdministratorGuard)
@Controller("admin/projects/:projectId/memberships")
export class ProjectMembershipController {
  constructor(private readonly memberships: ProjectMembershipService) {}

  @Get()
  @ApiOperation({
    operationId: "adminListProjectMemberships",
    summary: "List project memberships for administration.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiOkResponse({ type: ProjectMembershipResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Administrator access is required." })
  @ApiNotFoundResponse({ description: "The project was not found." })
  list(@Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.memberships.list(projectId);
  }

  @Put(":userId")
  @ApiOperation({
    operationId: "adminSetProjectMembership",
    summary: "Add an active project-scoped account to a project.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiParam({ name: "userId", description: "User identifier." })
  @ApiOkResponse({ type: ProjectMembershipResponseDto })
  @ApiBadRequestResponse({
    description: "The account cannot receive project membership.",
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Administrator access is required." })
  @ApiNotFoundResponse({ description: "The project or user was not found." })
  set(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.memberships.set(projectId, userId);
  }

  @Delete(":userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: "adminRemoveProjectMembership",
    summary: "Remove an account from a project.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiParam({ name: "userId", description: "User identifier." })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Administrator access is required." })
  @ApiNotFoundResponse({ description: "The project was not found." })
  remove(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.memberships.remove(projectId, userId);
  }
}
