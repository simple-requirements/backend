import { ApiProperty } from '@nestjs/swagger';

import type { RequirementReviewState } from '@/requirement-reviews/requirement-review-state.enum';

export class RequirementReviewSummaryResponseDto {
    @ApiProperty({ example: 3 })
    commentCount!: number;

    @ApiProperty({ example: 1 })
    openCommentCount!: number;

    @ApiProperty({ enum: ['not_started', 'in_review', 'decision_pending'] })
    state!: RequirementReviewState;
}
