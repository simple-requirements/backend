import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import type { RequirementResponseDto } from "@/projects/dto/requirement-response.dto";
import { RequirementStatus } from "@/projects/requirement-status.enum";
import { Requirement } from "@/projects/requirements.entity";
import { RequirementLifecycleService } from "@/projects/requirements/requirement-lifecycle.service";
import { RequirementResponseMapper } from "@/projects/requirements/requirement-response.mapper";
import { RequirementRevisionService } from "@/projects/requirements/requirement-revision.service";
import {
  RequirementRevisionChangeType,
  type RequirementRevisionActor,
  systemRevisionActor,
} from "@/projects/requirements/requirement-revision-metadata";
import type { ApproveRequirementDto } from "@/requirement-reviews/dto/approve-requirement.dto";
import type { CloseRequirementReviewCommentDto } from "@/requirement-reviews/dto/close-requirement-review-comment.dto";
import type { CreateRequirementReviewCommentDto } from "@/requirement-reviews/dto/create-requirement-review-comment.dto";
import type { CreateRequirementReviewCommentReplyDto } from "@/requirement-reviews/dto/create-requirement-review-comment-reply.dto";
import type { RequirementReviewCommentReplyResponseDto } from "@/requirement-reviews/dto/requirement-review-comment-reply-response.dto";
import type { RejectRequirementDto } from "@/requirement-reviews/dto/reject-requirement.dto";
import type { RequirementReviewCommentResponseDto } from "@/requirement-reviews/dto/requirement-review-comment-response.dto";
import type { RequirementReviewSummaryResponseDto } from "@/requirement-reviews/dto/requirement-review-summary-response.dto";
import { RequirementReviewCommentCloseReason } from "@/requirement-reviews/requirement-review-comment-close-reason.enum";
import { RequirementReviewCommentStatus } from "@/requirement-reviews/requirement-review-comment-status.enum";
import { RequirementReviewComment } from "@/requirement-reviews/requirement-review-comment.entity";
import { RequirementReviewCommentReply } from "@/requirement-reviews/requirement-review-comment-reply.entity";
import { RequirementReviewState } from "@/requirement-reviews/requirement-review-state.enum";

@Injectable()
export class RequirementReviewsService {
  constructor(
    @InjectRepository(Requirement)
    private readonly requirementsRepository: Repository<Requirement>,

    @InjectRepository(RequirementReviewComment)
    private readonly reviewCommentsRepository: Repository<RequirementReviewComment>,

    @InjectRepository(RequirementReviewCommentReply)
    private readonly reviewCommentRepliesRepository: Repository<RequirementReviewCommentReply>,
    private readonly lifecycle: RequirementLifecycleService,
    private readonly requirementMapper: RequirementResponseMapper,
    private readonly revisions: RequirementRevisionService,
  ) {}

  async findAllReviewComments(
    projectId: string,
    requirementId: string,
  ): Promise<RequirementReviewCommentResponseDto[]> {
    await this.getRequirementOrThrow(projectId, requirementId);

    const comments = await this.reviewCommentsRepository.find({
      where: { projectId, requirementId },
      relations: { replies: true },
      order: { createdAt: "ASC", replies: { createdAt: "ASC" } },
    });

    return comments.map((comment) => this.toReviewCommentResponseDto(comment));
  }

  async getReviewSummary(
    projectId: string,
    requirementId: string,
  ): Promise<RequirementReviewSummaryResponseDto> {
    await this.getRequirementOrThrow(projectId, requirementId);
    const [commentCount, openCommentCount] = await Promise.all([
      this.reviewCommentsRepository.count({
        where: { projectId, requirementId },
      }),
      this.reviewCommentsRepository.count({
        where: {
          projectId,
          requirementId,
          status: RequirementReviewCommentStatus.Open,
        },
      }),
    ]);

    let state = RequirementReviewState.DecisionPending;
    if (commentCount === 0) {
      state = RequirementReviewState.NotStarted;
    } else if (openCommentCount > 0) {
      state = RequirementReviewState.InReview;
    }

    return { commentCount, openCommentCount, state };
  }

  async createReviewComment(
    projectId: string,
    requirementId: string,
    createCommentDto: CreateRequirementReviewCommentDto,
  ): Promise<RequirementReviewCommentResponseDto> {
    const requirement = await this.getReviewableDraftRequirement(
      projectId,
      requirementId,
    );

    const comment = this.reviewCommentsRepository.create({
      projectId,
      requirementId,
      createdForRevisionNumber: requirement.revisionNumber,
      text: createCommentDto.text,
      status: RequirementReviewCommentStatus.Open,
      author: createCommentDto.author,
      closedBy: null,
      closeReason: null,
      closedInRevisionNumber: null,
      closedAt: null,
    });
    const savedComment = await this.reviewCommentsRepository.save(comment);

    return this.toReviewCommentResponseDto(savedComment);
  }

  async createReviewCommentReply(
    projectId: string,
    requirementId: string,
    commentId: string,
    createReplyDto: CreateRequirementReviewCommentReplyDto,
  ): Promise<RequirementReviewCommentReplyResponseDto> {
    await this.getReviewableDraftRequirement(projectId, requirementId);
    const comment = await this.getReviewCommentOrThrow(
      projectId,
      requirementId,
      commentId,
    );

    if (comment.status !== RequirementReviewCommentStatus.Open) {
      throw new BadRequestException(
        "Replies cannot be added to a closed review comment.",
      );
    }

    const reply = this.reviewCommentRepliesRepository.create({
      commentId,
      text: createReplyDto.text,
      author: createReplyDto.author,
    });

    return this.toReviewCommentReplyResponseDto(
      await this.reviewCommentRepliesRepository.save(reply),
    );
  }

  async closeReviewComment(
    projectId: string,
    requirementId: string,
    commentId: string,
    closeCommentDto: CloseRequirementReviewCommentDto,
  ): Promise<RequirementReviewCommentResponseDto> {
    const requirement = await this.getRequirementOrThrow(
      projectId,
      requirementId,
    );
    const comment = await this.getReviewCommentOrThrow(
      projectId,
      requirementId,
      commentId,
    );

    if (comment.status === RequirementReviewCommentStatus.Closed) {
      return this.toReviewCommentResponseDto(comment);
    }

    comment.status = RequirementReviewCommentStatus.Closed;
    comment.closedBy = closeCommentDto.closedBy;
    comment.closeReason = RequirementReviewCommentCloseReason.Resolved;
    comment.closedInRevisionNumber = requirement.revisionNumber;
    comment.closedAt = new Date();

    const savedComment = await this.reviewCommentsRepository.save(comment);

    return this.toReviewCommentResponseDto(savedComment);
  }

  async approveRequirement(
    projectId: string,
    requirementId: string,
    approveRequirementDto: ApproveRequirementDto,
    actor: RequirementRevisionActor = systemRevisionActor,
  ): Promise<RequirementResponseDto> {
    const requirement = await this.getReviewableDraftRequirement(
      projectId,
      requirementId,
    );
    const openCommentCount = await this.reviewCommentsRepository.count({
      where: {
        projectId,
        requirementId,
        status: RequirementReviewCommentStatus.Open,
      },
    });

    if (openCommentCount > 0) {
      throw new BadRequestException(
        "Requirement cannot be approved while review comments are open.",
      );
    }

    const update = {
      status: RequirementStatus.Approved,
      reviewer: approveRequirementDto.reviewer,
    };
    this.lifecycle.validateStatusChange(requirement, update);
    const revisionMetadata = {
      changeType: RequirementRevisionChangeType.Approved,
      changeReason: "Requirement approved.",
      actor,
    };
    await this.revisions.storeCurrent(requirement, revisionMetadata);

    requirement.revisionNumber += 1;
    this.lifecycle.applyStatusChange(requirement, update);
    this.revisions.applyCurrentMetadata(requirement, revisionMetadata);

    const savedRequirement =
      await this.requirementsRepository.save(requirement);

    return this.requirementMapper.fromRequirement(savedRequirement);
  }

  async rejectRequirement(
    projectId: string,
    requirementId: string,
    rejectRequirementDto: RejectRequirementDto,
    actor: RequirementRevisionActor = systemRevisionActor,
  ): Promise<RequirementResponseDto> {
    const requirement = await this.getReviewableDraftRequirement(
      projectId,
      requirementId,
    );

    const update = {
      status: RequirementStatus.Rejected,
      reviewer: rejectRequirementDto.reviewer,
      rejectionReason: rejectRequirementDto.rejectionReason,
    };
    this.lifecycle.validateStatusChange(requirement, update);
    const revisionMetadata = {
      changeType: RequirementRevisionChangeType.Rejected,
      changeReason: `Requirement rejected: ${rejectRequirementDto.rejectionReason}`,
      actor,
    };
    await this.revisions.storeCurrent(requirement, revisionMetadata);

    requirement.revisionNumber += 1;
    this.lifecycle.applyStatusChange(requirement, update);
    this.revisions.applyCurrentMetadata(requirement, revisionMetadata);

    const savedRequirement =
      await this.requirementsRepository.save(requirement);

    await this.closeOpenCommentsAfterRejection(
      projectId,
      requirementId,
      requirement.revisionNumber,
      rejectRequirementDto.reviewer,
    );

    return this.requirementMapper.fromRequirement(savedRequirement);
  }

  private async getReviewableDraftRequirement(
    projectId: string,
    requirementId: string,
  ): Promise<Requirement> {
    const requirement = await this.getRequirementOrThrow(
      projectId,
      requirementId,
    );

    if (requirement.deletedAt !== null) {
      throw new BadRequestException(
        `Requirement with id "${requirementId}" is in the recycle bin and cannot be reviewed.`,
      );
    }

    if (requirement.status !== RequirementStatus.Draft) {
      throw new BadRequestException(
        `Requirement in status "${requirement.status}" cannot be reviewed.`,
      );
    }

    return requirement;
  }

  private async getRequirementOrThrow(
    projectId: string,
    requirementId: string,
  ): Promise<Requirement> {
    const requirement = await this.requirementsRepository.findOne({
      where: { id: requirementId, projectId },
    });

    if (requirement === null) {
      throw new NotFoundException(
        `Requirement with id "${requirementId}" in project "${projectId}" was not found.`,
      );
    }

    return requirement;
  }

  private async getReviewCommentOrThrow(
    projectId: string,
    requirementId: string,
    commentId: string,
  ): Promise<RequirementReviewComment> {
    const comment = await this.reviewCommentsRepository.findOne({
      where: { id: commentId, projectId, requirementId },
    });

    if (comment === null) {
      throw new NotFoundException(
        `Review comment with id "${commentId}" for requirement "${requirementId}" in project "${projectId}" was not found.`,
      );
    }

    return comment;
  }

  private async closeOpenCommentsAfterRejection(
    projectId: string,
    requirementId: string,
    revisionNumber: number,
    reviewer: string,
  ): Promise<void> {
    const openComments = await this.reviewCommentsRepository.find({
      where: {
        projectId,
        requirementId,
        status: RequirementReviewCommentStatus.Open,
      },
    });

    if (openComments.length === 0) {
      return;
    }

    const closedAt = new Date();

    for (const comment of openComments) {
      comment.status = RequirementReviewCommentStatus.Closed;
      comment.closedBy = reviewer;
      comment.closeReason =
        RequirementReviewCommentCloseReason.RequirementRejected;
      comment.closedInRevisionNumber = revisionNumber;
      comment.closedAt = closedAt;
    }

    await this.reviewCommentsRepository.save(openComments);
  }

  private toReviewCommentResponseDto(
    comment: RequirementReviewComment,
  ): RequirementReviewCommentResponseDto {
    return {
      id: comment.id,
      projectId: comment.projectId,
      requirementId: comment.requirementId,
      createdForRevisionNumber: comment.createdForRevisionNumber,
      text: comment.text,
      status: comment.status,
      author: comment.author,
      closedBy: comment.closedBy,
      closeReason: comment.closeReason,
      closedInRevisionNumber: comment.closedInRevisionNumber,
      closedAt: comment.closedAt,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      replies: (comment.replies ?? []).map((reply) =>
        this.toReviewCommentReplyResponseDto(reply),
      ),
    };
  }

  private toReviewCommentReplyResponseDto(
    reply: RequirementReviewCommentReply,
  ): RequirementReviewCommentReplyResponseDto {
    return {
      id: reply.id,
      commentId: reply.commentId,
      text: reply.text,
      author: reply.author,
      createdAt: reply.createdAt,
    };
  }
}
