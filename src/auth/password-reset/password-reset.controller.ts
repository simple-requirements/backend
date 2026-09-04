import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiNoContentResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";

import {
  confirmPasswordResetSchema,
  requestPasswordResetSchema,
} from "@/auth/dto/auth.schemas";
import { ConfirmPasswordResetDto } from "@/auth/dto/confirm-password-reset.dto";
import { RequestPasswordResetDto } from "@/auth/dto/request-password-reset.dto";
import { PasswordResetService } from "@/auth/password-reset/password-reset.service";
import { getRequestSource } from "@/auth/sessions/request-source";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@ApiTags("authentication")
@Controller("auth/password-reset")
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post("request")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse()
  requestPasswordReset(
    @Body(new ZodValidationPipe(requestPasswordResetSchema))
    dto: RequestPasswordResetDto,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    return this.passwordResetService.request(
      dto.email,
      getRequestSource(request),
    );
  }

  @Post("confirm")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  confirmPasswordReset(
    @Body(new ZodValidationPipe(confirmPasswordResetSchema))
    dto: ConfirmPasswordResetDto,
  ): Promise<void> {
    return this.passwordResetService.confirm(dto);
  }
}
