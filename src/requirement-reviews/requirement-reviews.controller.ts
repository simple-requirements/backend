import {
  Body,
  Controller,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { RequirementResponseDto } from "@/projects/dto/requirement-response.dto";
import { ApproveRequirementDto } from "@/requirement-reviews/dto/approve-requirement.dto";
import { CloseRequirementReviewCommentDto } from "@/requirement-reviews/dto/close-requirement-review-comment.dto";
import { CreateRequirementReviewCommentDto } from "@/requirement-reviews/dto/create-requirement-review-comment.dto";
import { CreateRequirementReviewCommentReplyDto } from "@/requirement-reviews/dto/create-requirement-review-comment-reply.dto";
import { RejectRequirementDto } from "@/requirement-reviews/dto/reject-requirement.dto";
import { RequirementReviewCommentResponseDto } from "@/requirement-reviews/dto/requirement-review-comment-response.dto";
import { RequirementReviewCommentReplyResponseDto } from "@/requirement-reviews/dto/requirement-review-comment-reply-response.dto";
import { RequirementReviewSummaryResponseDto } from "@/requirement-reviews/dto/requirement-review-summary-response.dto";
import {
  approveRequirementSchema,
  closeRequirementReviewCommentSchema,
  createRequirementReviewCommentSchema,
  createRequirementReviewCommentReplySchema,
  rejectRequirementSchema,
} from "@/requirement-reviews/dto/requirement-review.schemas";
import { RequirementReviewsService } from "@/requirement-reviews/requirement-reviews.service";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { ProjectAuthorizationGuard } from "@/auth/authorization/project-authorization.guard";
import {
  ProjectPermission,
  RequireProjectPermission,
} from "@/auth/authorization/project-permission";
import type { AuthenticatedRequest } from "@/auth/sessions/authenticated-request";

@ApiTags("requirement reviews")
@ApiBearerAuth()
@Controller("projects/:projectId/requirements/:requirementId")
@UseGuards(SessionAuthGuard, ProjectAuthorizationGuard)
export class RequirementReviewsController {
  constructor(
    private readonly requirementReviewsService: RequirementReviewsService,
  ) {}

  @Get("review-comments")
  @RequireProjectPermission(ProjectPermission.Read)
  @ApiOperation({
    operationId: "listRequirementReviewComments",
    summary: "List review comments of a requirement.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiParam({ name: "requirementId", description: "Requirement identifier." })
  @ApiOkResponse({
    description: "All review comments of the requirement.",
    type: RequirementReviewCommentResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: "The requirement was not found." })
  async findAllReviewComments(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
  ): Promise<RequirementReviewCommentResponseDto[]> {
    return this.requirementReviewsService.findAllReviewComments(
      projectId,
      requirementId,
    );
  }

  @Get("review-summary")
  @RequireProjectPermission(ProjectPermission.Read)
  @ApiOperation({
    operationId: "getRequirementReviewSummary",
    summary: "Get the derived review state and comment counts.",
  })
  @ApiOkResponse({ type: RequirementReviewSummaryResponseDto })
  @ApiNotFoundResponse({ description: "The requirement was not found." })
  async getReviewSummary(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
  ): Promise<RequirementReviewSummaryResponseDto> {
    return this.requirementReviewsService.getReviewSummary(
      projectId,
      requirementId,
    );
  }

  @Post("review-comments")
  @RequireProjectPermission(ProjectPermission.ManageRequirements)
  @ApiOperation({
    operationId: "createRequirementReviewComment",
    summary: "Create a review comment.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiParam({ name: "requirementId", description: "Requirement identifier." })
  @ApiCreatedResponse({
    description: "The review comment was created.",
    type: RequirementReviewCommentResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      "The request body is invalid or the requirement cannot be reviewed.",
  })
  @ApiNotFoundResponse({ description: "The requirement was not found." })
  async createReviewComment(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Body(new ZodValidationPipe(createRequirementReviewCommentSchema))
    createCommentDto: CreateRequirementReviewCommentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RequirementReviewCommentResponseDto> {
    createCommentDto.author = request.authentication.user.displayName;
    return this.requirementReviewsService.createReviewComment(
      projectId,
      requirementId,
      createCommentDto,
    );
  }

  @Post("review-comments/:commentId/replies")
  @RequireProjectPermission(ProjectPermission.ManageRequirements)
  @ApiOperation({
    operationId: "createRequirementReviewCommentReply",
    summary: "Reply to an open review comment.",
  })
  @ApiCreatedResponse({ type: RequirementReviewCommentReplyResponseDto })
  @ApiBadRequestResponse({
    description:
      "The request body is invalid or the comment is already closed.",
  })
  @ApiNotFoundResponse({
    description: "The requirement or review comment was not found.",
  })
  async createReviewCommentReply(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Param("commentId") commentId: string,
    @Body(new ZodValidationPipe(createRequirementReviewCommentReplySchema))
    createReplyDto: CreateRequirementReviewCommentReplyDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RequirementReviewCommentReplyResponseDto> {
    return this.requirementReviewsService.createReviewCommentReply(
      projectId,
      requirementId,
      commentId,
      Object.assign(createReplyDto, {
        author: request.authentication.user.displayName,
      }),
    );
  }

  @Patch("review-comments/:commentId")
  @RequireProjectPermission(ProjectPermission.ManageRequirements)
  @ApiOperation({
    operationId: "closeRequirementReviewComment",
    summary: "Close a review comment.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiParam({ name: "requirementId", description: "Requirement identifier." })
  @ApiParam({ name: "commentId", description: "Review comment identifier." })
  @ApiOkResponse({
    description: "The review comment was closed.",
    type: RequirementReviewCommentResponseDto,
  })
  @ApiBadRequestResponse({ description: "The request body is invalid." })
  @ApiNotFoundResponse({
    description: "The requirement or review comment was not found.",
  })
  async closeReviewComment(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Param("commentId") commentId: string,
    @Body(new ZodValidationPipe(closeRequirementReviewCommentSchema))
    closeCommentDto: CloseRequirementReviewCommentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RequirementReviewCommentResponseDto> {
    return this.requirementReviewsService.closeReviewComment(
      projectId,
      requirementId,
      commentId,
      Object.assign(closeCommentDto, {
        closedBy: request.authentication.user.displayName,
      }),
    );
  }

  @Post("review/approve")
  @RequireProjectPermission(ProjectPermission.ManageRequirements)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "approveRequirementReview",
    summary: "Approve a reviewed requirement.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiParam({ name: "requirementId", description: "Requirement identifier." })
  @ApiOkResponse({
    description: "The requirement was approved.",
    type: RequirementResponseDto,
  })
  @ApiBadRequestResponse({ description: "The requirement cannot be approved." })
  @ApiNotFoundResponse({ description: "The requirement was not found." })
  async approveRequirement(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Body(new ZodValidationPipe(approveRequirementSchema))
    approveRequirementDto: ApproveRequirementDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RequirementResponseDto> {
    return this.requirementReviewsService.approveRequirement(
      projectId,
      requirementId,
      Object.assign(approveRequirementDto, {
        reviewer: request.authentication.user.displayName,
      }),
    );
  }

  @Post("review/reject")
  @RequireProjectPermission(ProjectPermission.ManageRequirements)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "rejectRequirementReview",
    summary: "Reject a reviewed requirement.",
  })
  @ApiParam({ name: "projectId", description: "Project identifier." })
  @ApiParam({ name: "requirementId", description: "Requirement identifier." })
  @ApiOkResponse({
    description: "The requirement was rejected.",
    type: RequirementResponseDto,
  })
  @ApiBadRequestResponse({ description: "The requirement cannot be rejected." })
  @ApiNotFoundResponse({ description: "The requirement was not found." })
  async rejectRequirement(
    @Param("projectId") projectId: string,
    @Param("requirementId") requirementId: string,
    @Body(new ZodValidationPipe(rejectRequirementSchema))
    rejectRequirementDto: RejectRequirementDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RequirementResponseDto> {
    return this.requirementReviewsService.rejectRequirement(
      projectId,
      requirementId,
      Object.assign(rejectRequirementDto, {
        reviewer: request.authentication.user.displayName,
      }),
    );
  }
}
