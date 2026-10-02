import { describe, expect, it } from 'vitest';

import {
    assignRequirementReviewTaskSchema,
    updateRequirementReviewTaskSchema,
} from '@/requirement-reviews/dto/requirement-review-task.schemas';

describe('requirement review task schemas', () => {
    it('accepts a UUID assignee and known status.', () => {
        expect(
            assignRequirementReviewTaskSchema.safeParse({ assigneeUserId: '44444444-4444-4444-8444-444444444444' })
                .success,
        ).toBe(true);
        expect(updateRequirementReviewTaskSchema.safeParse({ status: 'completed' }).success).toBe(true);
    });

    it('rejects invalid assignees and statuses.', () => {
        expect(assignRequirementReviewTaskSchema.safeParse({ assigneeUserId: 'not-a-uuid' }).success).toBe(false);
        expect(updateRequirementReviewTaskSchema.safeParse({ status: 'ignored' }).success).toBe(false);
    });
});
