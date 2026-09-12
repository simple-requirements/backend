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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import {
  ImplementationTicketResponseDto,
  UpsertImplementationTicketDto,
} from "@/projects/dto/implementation-ticket.dto";
import { implementationTicketSchema } from "@/projects/dto/project.schemas";
import { ProjectsService } from "@/projects/projects.service";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { ProjectAuthorizationGuard } from "@/auth/authorization/project-authorization.guard";
import {
  ProjectPermission,
  RequireProjectPermission,
} from "@/auth/authorization/project-permission";
import type { AuthenticatedRequest } from "@/auth/sessions/authenticated-request";
import { revisionActorFromAuthenticatedUser } from "@/projects/requirements/requirement-revision-metadata";

@ApiTags("implementation-tickets")
@ApiBearerAuth()
@Controller(
  "projects/:projectId/requirements/:requirementId/implementation-tickets",
)
@UseGuards(SessionAuthGuard, ProjectAuthorizationGuard)
export class ImplementationTicketsController {
  constructor(private readonly projectsService: ProjectsService) {}
  @Get()
  @RequireProjectPermission(ProjectPermission.Read)
  @ApiOperation({
    operationId: "listImplementationTickets",
    summary: "List implementation tickets.",
  })
  @ApiOkResponse({ type: ImplementationTicketResponseDto, isArray: true })
  list(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
  ) {
    return this.projectsService.listImplementationTickets(
      projectId,
      requirementId,
    );
  }
  @Post()
  @RequireProjectPermission(ProjectPermission.ManageTickets)
  @ApiOperation({
    operationId: "createImplementationTicket",
    summary: "Add an implementation ticket.",
  })
  @ApiCreatedResponse({ type: ImplementationTicketResponseDto })
  create(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Body(new ZodValidationPipe(implementationTicketSchema))
    dto: UpsertImplementationTicketDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projectsService.createImplementationTicket(
      projectId,
      requirementId,
      dto,
      revisionActorFromAuthenticatedUser(request.authentication.user),
    );
  }
  @Patch(":ticketRecordId")
  @RequireProjectPermission(ProjectPermission.ManageTickets)
  @ApiOperation({
    operationId: "updateImplementationTicket",
    summary: "Update an implementation ticket.",
  })
  @ApiOkResponse({ type: ImplementationTicketResponseDto })
  update(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Param("ticketRecordId") ticketRecordId: string,
    @Body(new ZodValidationPipe(implementationTicketSchema))
    dto: UpsertImplementationTicketDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projectsService.updateImplementationTicket(
      projectId,
      requirementId,
      ticketRecordId,
      dto,
      revisionActorFromAuthenticatedUser(request.authentication.user),
    );
  }
  @Delete(":ticketRecordId")
  @RequireProjectPermission(ProjectPermission.ManageTickets)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: "deleteImplementationTicket",
    summary: "Remove an implementation ticket.",
  })
  @ApiNoContentResponse()
  async delete(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Param("ticketRecordId") ticketRecordId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.projectsService.deleteImplementationTicket(
      projectId,
      requirementId,
      ticketRecordId,
      revisionActorFromAuthenticatedUser(request.authentication.user),
    );
  }
}
