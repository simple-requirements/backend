import { describe, expect, it } from 'vitest';

import {
    approveRequirementSchema,
    closeRequirementReviewCommentSchema,
    createRequirementReviewCommentReplySchema,
    createRequirementReviewCommentSchema,
    rejectRequirementSchema,
} from '@/requirement-reviews/dto/requirement-review.schemas';

describe('requirement review request schemas', () => {
    it('accepts review comment text without trusting a client-supplied author.', () => {
        expect(createRequirementReviewCommentSchema.parse({ text: '  Clarify this.  ' })).toEqual({
            text: 'Clarify this.',
            author: '__server_derived_actor__',
        });
        expect(createRequirementReviewCommentReplySchema.parse({ text: '  Done.  ' })).toEqual({
            text: 'Done.',
            author: '__server_derived_actor__',
        });
    });

    it('accepts review decisions and comment resolution without client-supplied actor names.', () => {
        expect(approveRequirementSchema.parse({})).toEqual({ reviewer: '__server_derived_actor__' });
        expect(rejectRequirementSchema.parse({ rejectionReason: '  Ambiguous.  ' })).toEqual({
            reviewer: '__server_derived_actor__',
            rejectionReason: 'Ambiguous.',
        });
        expect(closeRequirementReviewCommentSchema.parse({})).toEqual({ closedBy: '__server_derived_actor__' });
    });
});
