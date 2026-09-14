import {
  Body,
  Controller,
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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { AdministratorGuard } from "@/auth/authorization/administrator.guard";
import {
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "@/auth/dto/auth.schemas";
import { SessionResponseDto } from "@/auth/dto/session-response.dto";
import { UpdateUserRoleDto } from "@/auth/dto/update-user-role.dto";
import { UpdateUserStatusDto } from "@/auth/dto/update-user-status.dto";
import { UserAdministrationResponseDto } from "@/auth/dto/user-administration-response.dto";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { UserAdministrationService } from "@/auth/administration/user-administration.service";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@ApiTags("user administration")
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, AdministratorGuard)
@Controller("admin/users")
export class UserAdministrationController {
  constructor(private readonly users: UserAdministrationService) {}

  @Get()
  @ApiOkResponse({ type: UserAdministrationResponseDto, isArray: true })
  list(): Promise<UserAdministrationResponseDto[]> {
    return this.users.list();
  }

  @Get(":userId")
  @ApiOkResponse({ type: UserAdministrationResponseDto })
  find(
    @Param("userId", ParseUUIDPipe) userId: string,
  ): Promise<UserAdministrationResponseDto> {
    return this.users.find(userId);
  }

  @Patch(":userId/role")
  @ApiOperation({
    summary: "Assign or change an account role",
    description:
      "Roles can be assigned while an account is pending or changed while it is deactivated. Active accounts must be deactivated first. Administrator accounts cannot retain project memberships.",
  })
  @ApiOkResponse({ type: UserAdministrationResponseDto })
  @ApiConflictResponse({
    description:
      "The account is active or Administrator assignment conflicts with existing project memberships.",
  })
  updateRole(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(updateUserRoleSchema))
    update: UpdateUserRoleDto,
  ): Promise<UserAdministrationResponseDto> {
    return this.users.assignRole(userId, update.role);
  }

  @Patch(":userId/status")
  @ApiOkResponse({ type: UserAdministrationResponseDto })
  updateStatus(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(updateUserStatusSchema))
    update: UpdateUserStatusDto,
  ): Promise<UserAdministrationResponseDto> {
    return this.users.updateStatus(userId, update.status);
  }

  @Get(":userId/sessions")
  @ApiOkResponse({ type: SessionResponseDto, isArray: true })
  listSessions(
    @Param("userId", ParseUUIDPipe) userId: string,
  ): Promise<SessionResponseDto[]> {
    return this.users.listSessions(userId);
  }

  @Post(":userId/sessions/revoke")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  revokeAll(@Param("userId", ParseUUIDPipe) userId: string): Promise<void> {
    return this.users.revokeAllSessions(userId);
  }

  @Post(":userId/sessions/:sessionId/revoke")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  revokeOne(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    return this.users.revokeSession(userId, sessionId);
  }
}
