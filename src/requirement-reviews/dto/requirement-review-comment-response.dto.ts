import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { RequirementReviewCommentCloseReason } from '@/requirement-reviews/requirement-review-comment-close-reason.enum';
import { RequirementReviewCommentStatus } from '@/requirement-reviews/requirement-review-comment-status.enum';

export class RequirementReviewCommentResponseDto {
    @ApiProperty({ example: '8b7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d14' })
    id!: string;

    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2c' })
    projectId!: string;

    @ApiProperty({ example: '3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11' })
    requirementId!: string;

    @ApiProperty({ example: 1, description: 'Requirement revision number this comment was created against.' })
    createdForRevisionNumber!: number;

    @ApiProperty({ example: 'Please define the allowed authentication methods.' })
    text!: string;

    @ApiProperty({ enum: RequirementReviewCommentStatus, example: RequirementReviewCommentStatus.Open })
    status!: RequirementReviewCommentStatus;

    @ApiProperty({ example: 'Jane Reviewer' })
    author!: string;

    @ApiPropertyOptional({ example: 'Jane Reviewer', nullable: true })
    closedBy!: string | null;

    @ApiPropertyOptional({ enum: RequirementReviewCommentCloseReason, nullable: true })
    closeReason!: RequirementReviewCommentCloseReason | null;

    @ApiPropertyOptional({ example: 2, nullable: true })
    closedInRevisionNumber!: number | null;

    @ApiPropertyOptional({ example: '2026-06-28T10:00:00.000Z', nullable: true })
    closedAt!: Date | null;

    @ApiProperty({ example: '2026-06-28T10:00:00.000Z' })
    createdAt!: Date;

    @ApiProperty({ example: '2026-06-28T10:00:00.000Z' })
    updatedAt!: Date;
}
