import { z } from 'zod';

import type { ZodValidationSchema } from '@/common/pipes/zod-validation.pipe';
import type { ApproveRequirementDto } from '@/requirement-reviews/dto/approve-requirement.dto';
import type { CloseRequirementReviewCommentDto } from '@/requirement-reviews/dto/close-requirement-review-comment.dto';
import type { CreateRequirementReviewCommentDto } from '@/requirement-reviews/dto/create-requirement-review-comment.dto';
import type { RejectRequirementDto } from '@/requirement-reviews/dto/reject-requirement.dto';

function requestBodySchema(message: string): z.ZodType<Record<string, unknown>> {
    return z.custom<Record<string, unknown>>(
        (value): value is Record<string, unknown> =>
            typeof value === 'object' && value !== null && !Array.isArray(value),
        { message },
    );
}

function trimmedStringSchema(typeMessage: string, emptyMessage: string): z.ZodType<string> {
    return z
        .custom<string>((value): value is string => typeof value === 'string', { message: typeMessage })
        .transform((value) => value.trim())
        .refine((value) => value.length > 0, { message: emptyMessage });
}

const reviewRequestBodySchema = requestBodySchema('Requirement review request body must be an object.');
const reviewCommentTextSchema = trimmedStringSchema(
    'Review comment text must be a string.',
    'Review comment text must not be empty.',
);
const reviewAuthorSchema = trimmedStringSchema('Review comment author must be a string.', 'Review comment author must not be empty.');
const reviewerSchema = trimmedStringSchema('Reviewer must be a string.', 'Reviewer must not be empty.');
const rejectionReasonSchema = trimmedStringSchema(
    'Rejection reason must be a string.',
    'Rejection reason must not be empty.',
);
const closedBySchema = trimmedStringSchema('Closed by must be a string.', 'Closed by must not be empty.');

export const createRequirementReviewCommentSchema: ZodValidationSchema<CreateRequirementReviewCommentDto> =
    reviewRequestBodySchema.pipe(z.object({ text: reviewCommentTextSchema, author: reviewAuthorSchema }));

export const closeRequirementReviewCommentSchema: ZodValidationSchema<CloseRequirementReviewCommentDto> =
    reviewRequestBodySchema.pipe(z.object({ closedBy: closedBySchema }));

export const approveRequirementSchema: ZodValidationSchema<ApproveRequirementDto> = reviewRequestBodySchema.pipe(
    z.object({ reviewer: reviewerSchema }),
);

export const rejectRequirementSchema: ZodValidationSchema<RejectRequirementDto> = reviewRequestBodySchema.pipe(
    z.object({ reviewer: reviewerSchema, rejectionReason: rejectionReasonSchema }),
);
