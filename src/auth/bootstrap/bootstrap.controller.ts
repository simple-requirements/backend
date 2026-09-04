import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";

import { BootstrapService } from "@/auth/bootstrap/bootstrap.service";
import { bootstrapAdministratorSchema } from "@/auth/dto/auth.schemas";
import { BootstrapAdministratorDto } from "@/auth/dto/bootstrap-administrator.dto";
import { BootstrapResponseDto } from "@/auth/dto/bootstrap-response.dto";
import { BootstrapStatusResponseDto } from "@/auth/dto/bootstrap-status-response.dto";
import { getRequestSource } from "@/auth/sessions/request-source";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@ApiTags("authentication")
@Controller("auth/bootstrap")
export class BootstrapController {
  constructor(private readonly bootstrapService: BootstrapService) {}

  @Get("status")
  @ApiOperation({
    operationId: "getAuthenticationBootstrapStatus",
    summary: "Check whether initial Administrator registration is available.",
  })
  @ApiOkResponse({ type: BootstrapStatusResponseDto })
  status(): Promise<BootstrapStatusResponseDto> {
    return this.bootstrapService.status();
  }

  @Post("administrator")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    operationId: "bootstrapAdministrator",
    summary: "Register the first local Administrator account.",
  })
  @ApiAcceptedResponse({ type: BootstrapResponseDto })
  @ApiBadRequestResponse({ description: "The request is malformed." })
  @ApiForbiddenResponse({ description: "Bootstrap is not available." })
  @ApiConflictResponse({ description: "Bootstrap has already completed." })
  bootstrapAdministrator(
    @Body(new ZodValidationPipe(bootstrapAdministratorSchema))
    registration: BootstrapAdministratorDto,
    @Req() request: Request,
  ): Promise<BootstrapResponseDto> {
    return this.bootstrapService.registerAdministrator(
      registration,
      getRequestSource(request),
    );
  }
}
