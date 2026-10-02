import { z } from 'zod';

import type {
    AssignRequirementReviewTaskDto,
    UpdateRequirementReviewTaskDto,
} from '@/requirement-reviews/dto/requirement-review-task.dto';
import { RequirementReviewTaskStatus } from '@/requirement-reviews/requirement-review-task-status.enum';

export const assignRequirementReviewTaskSchema = z.object({
    assigneeUserId: z.string().uuid(),
}) satisfies z.ZodType<AssignRequirementReviewTaskDto>;

export const updateRequirementReviewTaskSchema = z.object({
    status: z.enum(RequirementReviewTaskStatus),
}) satisfies z.ZodType<UpdateRequirementReviewTaskDto>;
