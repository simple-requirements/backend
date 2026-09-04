import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request } from "express";

import type { AuthenticatedRequest } from "@/auth/sessions/authenticated-request";
import { AuthenticatedUserResponseDto } from "@/auth/dto/authenticated-user-response.dto";
import { loginSchema } from "@/auth/dto/auth.schemas";
import { LoginDto } from "@/auth/dto/login.dto";
import { LoginResponseDto } from "@/auth/dto/login-response.dto";
import { getRequestSource } from "@/auth/sessions/request-source";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { SessionService } from "@/auth/sessions/session.service";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@ApiTags("authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly sessionService: SessionService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description: "The credentials are invalid or the account is unavailable.",
  })
  login(
    @Body(new ZodValidationPipe(loginSchema)) login: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    return this.sessionService.login(login, getRequestSource(request));
  }

  @Post("logout")
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.sessionService.revokeSession(request.authentication.session.id);
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthenticatedUserResponseDto })
  me(@Req() request: AuthenticatedRequest): AuthenticatedUserResponseDto {
    const { user, globalRoles } = request.authentication;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      globalRoles: [...globalRoles],
    };
  }
}
