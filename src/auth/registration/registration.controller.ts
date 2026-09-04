import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { RegistrationService } from "@/auth/registration/registration.service";
import {
  confirmEmailVerificationSchema,
  registerUserSchema,
  resendEmailVerificationSchema,
} from "@/auth/dto/auth.schemas";
import { ConfirmEmailVerificationDto } from "@/auth/dto/confirm-email-verification.dto";
import { RegisterUserDto } from "@/auth/dto/register-user.dto";
import { RegistrationResponseDto } from "@/auth/dto/registration-response.dto";
import { ResendEmailVerificationResponseDto } from "@/auth/dto/resend-email-verification-response.dto";
import { ResendEmailVerificationDto } from "@/auth/dto/resend-email-verification.dto";
import { EmailVerificationService } from "@/auth/registration/email-verification.service";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@ApiTags("authentication")
@Controller("auth")
export class RegistrationController {
  constructor(
    private readonly authService: RegistrationService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    operationId: "registerUser",
    summary: "Register a pending local user account.",
  })
  @ApiAcceptedResponse({
    description: "The registration request was accepted.",
    type: RegistrationResponseDto,
  })
  @ApiBadRequestResponse({
    description: "The registration request is malformed.",
  })
  register(
    @Body(new ZodValidationPipe(registerUserSchema))
    registration: RegisterUserDto,
  ): Promise<RegistrationResponseDto> {
    return this.authService.register(registration);
  }

  @Post("email-verification/confirm")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: "confirmEmailVerification",
    summary: "Confirm a local account email address.",
  })
  @ApiNoContentResponse({ description: "The email address was verified." })
  @ApiBadRequestResponse({
    description: "The verification link is invalid or expired.",
  })
  async confirmEmailVerification(
    @Body(new ZodValidationPipe(confirmEmailVerificationSchema))
    confirmation: ConfirmEmailVerificationDto,
  ): Promise<void> {
    await this.emailVerificationService.confirm(confirmation.token);
  }

  @Post("email-verification/resend")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    operationId: "resendEmailVerification",
    summary: "Request another verification email.",
  })
  @ApiAcceptedResponse({
    description:
      "The request was accepted without disclosing account eligibility.",
    type: ResendEmailVerificationResponseDto,
  })
  @ApiBadRequestResponse({ description: "The resend request is malformed." })
  resendEmailVerification(
    @Body(new ZodValidationPipe(resendEmailVerificationSchema))
    resend: ResendEmailVerificationDto,
  ): Promise<ResendEmailVerificationResponseDto> {
    return this.emailVerificationService.resend(resend.username);
  }
}
