import {
  Body,
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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AdministratorGuard } from "@/auth/authorization/administrator.guard";
import { projectMembershipSchema } from "@/auth/dto/auth.schemas";
import { ProjectMembershipResponseDto } from "@/auth/dto/project-membership-response.dto";
import { SetProjectMembershipDto } from "@/auth/dto/set-project-membership.dto";
import { ProjectMembershipService } from "@/auth/authorization/project-membership.service";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@ApiTags("project memberships")
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, AdministratorGuard)
@Controller("admin/projects/:projectId/memberships")
export class ProjectMembershipController {
  constructor(private readonly memberships: ProjectMembershipService) {}
  @Get()
  @ApiOkResponse({ type: ProjectMembershipResponseDto, isArray: true })
  list(@Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.memberships.list(projectId);
  }
  @Put(":userId")
  @ApiOkResponse({ type: ProjectMembershipResponseDto })
  set(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(projectMembershipSchema))
    dto: SetProjectMembershipDto,
  ) {
    return this.memberships.set(projectId, userId, dto.roles);
  }
  @Delete(":userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.memberships.remove(projectId, userId);
  }
}
