import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { RequirementResponseDto } from '@/projects/dto/requirement-response.dto';
import { RequirementRevision } from '@/projects/requirement-revisions.entity';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import { Requirement } from '@/projects/requirements.entity';
import type { ApproveRequirementDto } from '@/requirement-reviews/dto/approve-requirement.dto';
import type { CloseRequirementReviewCommentDto } from '@/requirement-reviews/dto/close-requirement-review-comment.dto';
import type { CreateRequirementReviewCommentDto } from '@/requirement-reviews/dto/create-requirement-review-comment.dto';
import type { RejectRequirementDto } from '@/requirement-reviews/dto/reject-requirement.dto';
import type { RequirementReviewCommentResponseDto } from '@/requirement-reviews/dto/requirement-review-comment-response.dto';
import { RequirementReviewCommentCloseReason } from '@/requirement-reviews/requirement-review-comment-close-reason.enum';
import { RequirementReviewCommentStatus } from '@/requirement-reviews/requirement-review-comment-status.enum';
import { RequirementReviewComment } from '@/requirement-reviews/requirement-review-comment.entity';

@Injectable()
export class RequirementReviewsService {
    constructor(
        @InjectRepository(Requirement)
        private readonly requirementsRepository: Repository<Requirement>,

        @InjectRepository(RequirementRevision)
        private readonly requirementRevisionsRepository: Repository<RequirementRevision>,

        @InjectRepository(RequirementReviewComment)
        private readonly reviewCommentsRepository: Repository<RequirementReviewComment>,
    ) {}

    async findAllReviewComments(
        projectId: string,
        requirementId: string,
    ): Promise<RequirementReviewCommentResponseDto[]> {
        await this.getRequirementOrThrow(projectId, requirementId);

        const comments = await this.reviewCommentsRepository.find({
            where: { projectId, requirementId },
            order: { createdAt: 'ASC' },
        });

        return comments.map((comment) => this.toReviewCommentResponseDto(comment));
    }

    async createReviewComment(
        projectId: string,
        requirementId: string,
        createCommentDto: CreateRequirementReviewCommentDto,
    ): Promise<RequirementReviewCommentResponseDto> {
        const requirement = await this.getReviewableDraftRequirement(projectId, requirementId);

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

    async closeReviewComment(
        projectId: string,
        requirementId: string,
        commentId: string,
        closeCommentDto: CloseRequirementReviewCommentDto,
    ): Promise<RequirementReviewCommentResponseDto> {
        const requirement = await this.getRequirementOrThrow(projectId, requirementId);
        const comment = await this.getReviewCommentOrThrow(projectId, requirementId, commentId);

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
    ): Promise<RequirementResponseDto> {
        const requirement = await this.getReviewableDraftRequirement(projectId, requirementId);
        const openCommentCount = await this.reviewCommentsRepository.count({
            where: { projectId, requirementId, status: RequirementReviewCommentStatus.Open },
        });

        if (openCommentCount > 0) {
            throw new BadRequestException('Requirement cannot be approved while review comments are open.');
        }

        await this.storeCurrentRequirementRevision(requirement);

        requirement.revisionNumber += 1;
        requirement.status = RequirementStatus.Approved;
        requirement.reviewer = approveRequirementDto.reviewer;
        requirement.rejectionReason = null;
        requirement.rejectedAt = null;
        requirement.approvedAt = new Date();
        requirement.implementedAt = null;
        requirement.obsolescenceReason = null;
        requirement.obsoleteAt = null;

        const savedRequirement = await this.requirementsRepository.save(requirement);

        return this.toRequirementResponseDto(savedRequirement);
    }

    async rejectRequirement(
        projectId: string,
        requirementId: string,
        rejectRequirementDto: RejectRequirementDto,
    ): Promise<RequirementResponseDto> {
        const requirement = await this.getReviewableDraftRequirement(projectId, requirementId);

        await this.storeCurrentRequirementRevision(requirement);

        requirement.revisionNumber += 1;
        requirement.status = RequirementStatus.Rejected;
        requirement.reviewer = rejectRequirementDto.reviewer;
        requirement.rejectionReason = rejectRequirementDto.rejectionReason;
        requirement.rejectedAt = new Date();
        requirement.approvedAt = null;
        requirement.implementedAt = null;
        requirement.obsolescenceReason = null;
        requirement.obsoleteAt = null;

        const savedRequirement = await this.requirementsRepository.save(requirement);

        await this.closeOpenCommentsAfterRejection(projectId, requirementId, requirement.revisionNumber, rejectRequirementDto.reviewer);

        return this.toRequirementResponseDto(savedRequirement);
    }

    private async getReviewableDraftRequirement(projectId: string, requirementId: string): Promise<Requirement> {
        const requirement = await this.getRequirementOrThrow(projectId, requirementId);

        if (requirement.deletedAt !== null) {
            throw new BadRequestException(
                `Requirement with id "${requirementId}" is in the recycle bin and cannot be reviewed.`,
            );
        }

        if (requirement.status !== RequirementStatus.Draft) {
            throw new BadRequestException(`Requirement in status "${requirement.status}" cannot be reviewed.`);
        }

        return requirement;
    }

    private async getRequirementOrThrow(projectId: string, requirementId: string): Promise<Requirement> {
        const requirement = await this.requirementsRepository.findOne({ where: { id: requirementId, projectId } });

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
        const comment = await this.reviewCommentsRepository.findOne({ where: { id: commentId, projectId, requirementId } });

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
            where: { projectId, requirementId, status: RequirementReviewCommentStatus.Open },
        });

        if (openComments.length === 0) {
            return;
        }

        const closedAt = new Date();

        for (const comment of openComments) {
            comment.status = RequirementReviewCommentStatus.Closed;
            comment.closedBy = reviewer;
            comment.closeReason = RequirementReviewCommentCloseReason.RequirementRejected;
            comment.closedInRevisionNumber = revisionNumber;
            comment.closedAt = closedAt;
        }

        await this.reviewCommentsRepository.save(openComments);
    }

    private async storeCurrentRequirementRevision(requirement: Requirement): Promise<void> {
        const revision = this.requirementRevisionsRepository.create({
            requirementId: requirement.id,
            projectId: requirement.projectId,
            categoryId: requirement.categoryId,
            sequenceNumber: requirement.sequenceNumber,
            visibleKey: requirement.visibleKey,
            revisionNumber: requirement.revisionNumber,
            status: requirement.status,
            description: requirement.description,
            priority: requirement.priority,
            owner: requirement.owner,
            rationale: requirement.rationale,
            source: requirement.source,
            rejectionReason: requirement.rejectionReason,
            reviewer: requirement.reviewer,
            rejectedAt: requirement.rejectedAt,
            deletedAt: requirement.deletedAt,
            approvedAt: requirement.approvedAt,
            implementedAt: requirement.implementedAt,
            obsolescenceReason: requirement.obsolescenceReason,
            obsoleteAt: requirement.obsoleteAt,
            createdAt: requirement.createdAt,
            updatedAt: requirement.updatedAt,
        });

        await this.requirementRevisionsRepository.save(revision);
    }

    private toReviewCommentResponseDto(comment: RequirementReviewComment): RequirementReviewCommentResponseDto {
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
        };
    }

    private toRequirementResponseDto(requirement: Requirement): RequirementResponseDto {
        return {
            id: requirement.id,
            projectId: requirement.projectId,
            categoryId: requirement.categoryId,
            sequenceNumber: requirement.sequenceNumber,
            visibleKey: requirement.visibleKey,
            revisionNumber: requirement.revisionNumber,
            status: requirement.status,
            description: requirement.description,
            priority: requirement.priority,
            owner: requirement.owner,
            rationale: requirement.rationale,
            source: requirement.source,
            rejectionReason: requirement.rejectionReason,
            reviewer: requirement.reviewer,
            rejectedAt: requirement.rejectedAt,
            deletedAt: requirement.deletedAt,
            approvedAt: requirement.approvedAt,
            implementedAt: requirement.implementedAt,
            obsolescenceReason: requirement.obsolescenceReason,
            obsoleteAt: requirement.obsoleteAt,
            createdAt: requirement.createdAt,
            updatedAt: requirement.updatedAt,
        };
    }
}
