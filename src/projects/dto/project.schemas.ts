import { z } from 'zod';

import type { ZodValidationSchema } from '@/common/pipes/zod-validation.pipe';
import { CategoryType } from '@/projects/category-type.enum';
import { CATEGORY_KEY_PATTERN } from '@/projects/requirement.constants';
import type { CreateCategoryDto } from '@/projects/dto/create-category.dto';
import type { CreateProjectDto } from '@/projects/dto/create-project.dto';
import type { CreateRequirementDto } from '@/projects/dto/create-requirement.dto';
import type { UpdateCategoryDto } from '@/projects/dto/update-category.dto';
import type { UpdateProjectDto } from '@/projects/dto/update-project.dto';
import type { UpdateRequirementDto } from '@/projects/dto/update-requirement.dto';
import type { UpsertImplementationTicketDto } from '@/projects/dto/implementation-ticket.dto';
import { RequirementStatus } from '@/projects/requirement-status.enum';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIORITIES = ['p1', 'p2', 'p3'] as const;
const CONTENT_UPDATE_FIELDS = ['categoryId', 'description', 'priority', 'owner', 'rationale', 'source'] as const;
const CHANGE_REASON_FIELD = 'changeReason' as const;
const STATUS_UPDATE_FIELDS = ['status', 'reviewer', 'rejectionReason', 'obsoletedBy', 'obsolescenceReason'] as const;

function requestBodySchema(message: string): z.ZodType<Record<string, unknown>> {
    return z.custom<Record<string, unknown>>(
        (value): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value),
        { message },
    );
}

function trimmedStringSchema(typeMessage: string, emptyMessage: string): z.ZodType<string> {
    return z
        .custom<string>((value): value is string => typeof value === 'string', {
            message: typeMessage,
        })
        .transform((value) => value.trim())
        .refine((value) => value.length > 0, { message: emptyMessage });
}

function nullableTrimmedStringSchema(typeMessage: string): z.ZodType<string | null> {
    return z
        .custom<string | null>((value): value is string | null => value === null || typeof value === 'string', {
            message: typeMessage,
        })
        .transform((value) => {
            if (value === null) {
                return null;
            }

            const trimmedValue = value.trim();

            return trimmedValue.length === 0 ? null : trimmedValue;
        });
}

function revisionNumberQuerySchema(): z.ZodType<number | undefined> {
    return z
        .custom<string | undefined>((value): value is string | undefined => value === undefined || typeof value === 'string', {
            message: 'Revision query parameter must be a positive integer.',
        })
        .transform((value) => (value === undefined ? undefined : Number(value)))
        .refine((value) => value === undefined || (Number.isInteger(value) && value > 0), {
            message: 'Revision query parameter must be a positive integer.',
        });
}

function uuidSchema(message: string): z.ZodType<string> {
    return z
        .custom<string>((value): value is string => typeof value === 'string', {
            message,
        })
        .refine((value) => UUID_REGEX.test(value), { message });
}

function hasAnyField<TField extends string>(value: Partial<Record<TField, unknown>>, fields: readonly TField[]): boolean {
    return fields.some((field) => value[field] !== undefined);
}

const projectNameSchema = trimmedStringSchema('Project name must be a string.', 'Project name must not be empty.');
const ticketUrlTemplateSchema = z
    .custom<string | null>((value): value is string | null => value === null || typeof value === 'string', { message: 'Ticket URL template must be a string or null.' })
    .transform((value) => value === null || value.trim() === '' ? null : value.trim())
    .refine((value) => value === null || value.split('{ticket-id}').length === 2, { message: 'Ticket URL template must contain {ticket-id} exactly once.' })
    .refine((value) => {
        if (value === null) return true;
        try {
            const url = new URL(value.replace('{ticket-id}', 'SOLAR-4711'));
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }, { message: 'Ticket URL template must produce an absolute HTTP or HTTPS URL.' });
const categoryNameSchema = trimmedStringSchema('Category name must be a string.', 'Category name must not be empty.');

const categoryKeySchema = z
    .custom<string>((value): value is string => typeof value === 'string', {
        message: 'Category key must be a string.',
    })
    .transform((value) => value.trim().toUpperCase())
    .refine((value) => CATEGORY_KEY_PATTERN.test(value), {
        message: 'Category key must contain 2 to 4 uppercase letters.',
    });

const categoryTypeSchema = z.custom<CategoryType>((value): value is CategoryType => value === CategoryType.FR || value === CategoryType.NFR, {
    message: 'Category type must be either FR or NFR.',
});

const categoryIdSchema = uuidSchema('Category id must be a valid UUID.');
const requirementTextSchema = nullableTrimmedStringSchema('Requirement text fields must be strings or null.');
const reviewerSchema = nullableTrimmedStringSchema('Reviewer must be a string or null.');
const obsoletedBySchema = nullableTrimmedStringSchema('Obsoleted by must be a string or null.');
const rejectionReasonSchema = nullableTrimmedStringSchema('Rejection reason must be a string or null.');
const obsolescenceReasonSchema = nullableTrimmedStringSchema('Obsolescence reason must be a string or null.');
const changeReasonSchema = trimmedStringSchema('Change reason must be a string.', 'Change reason must not be empty.').pipe(z.string().max(500));

const prioritySchema = z
    .custom<string | null>((value): value is string | null => value === null || typeof value === 'string', {
        message: 'Requirement priority must be p1, p2, p3, or null.',
    })
    .transform((value) => (value === null ? null : value.trim().toLowerCase()))
    .refine((value) => value === null || PRIORITIES.includes(value as (typeof PRIORITIES)[number]), {
        message: 'Requirement priority must be p1, p2, p3, or null.',
    });

const requirementStatusSchema = z.custom<RequirementStatus>(
    (value): value is RequirementStatus =>
        value === RequirementStatus.Draft ||
        value === RequirementStatus.Approved ||
        value === RequirementStatus.Implemented ||
        value === RequirementStatus.Obsolete ||
        value === RequirementStatus.Rejected,
    { message: 'Requirement status is invalid.' },
);

const projectRequestBodySchema = requestBodySchema('Project request body must be an object.');
const categoryRequestBodySchema = requestBodySchema('Category request body must be an object.');
const requirementRequestBodySchema = requestBodySchema('Requirement request body must be an object.');

export const createProjectSchema: ZodValidationSchema<CreateProjectDto> = projectRequestBodySchema.pipe(z.object({ name: projectNameSchema }));

export const updateProjectSchema: ZodValidationSchema<UpdateProjectDto> = projectRequestBodySchema.pipe(
    z.object({ name: projectNameSchema.optional(), ticketUrlTemplate: ticketUrlTemplateSchema.optional() })
        .refine((value) => value.name !== undefined || value.ticketUrlTemplate !== undefined, { message: 'At least one project field must be provided.' }),
);

export const implementationTicketSchema: ZodValidationSchema<UpsertImplementationTicketDto> = requirementRequestBodySchema.pipe(
    z.object({
        ticketId: trimmedStringSchema('Ticket ID must be a string.', 'Ticket ID must not be empty.').pipe(z.string().max(120)),
        completedBy: trimmedStringSchema('Completed by must be a string.', 'Completed by must not be empty.').pipe(z.string().max(120)),
        completedAt: z.iso.date('Completion date must use YYYY-MM-DD.'),
    }),
);

export const createCategorySchema: ZodValidationSchema<CreateCategoryDto> = categoryRequestBodySchema.pipe(
    z.object({
        name: categoryNameSchema,
        key: categoryKeySchema,
        type: categoryTypeSchema,
    }),
);

export const updateCategorySchema: ZodValidationSchema<UpdateCategoryDto> = categoryRequestBodySchema.pipe(
    z
        .object({
            name: categoryNameSchema.optional(),
            key: categoryKeySchema.optional(),
            type: categoryTypeSchema.optional(),
        })
        .refine((categoryPatch) => categoryPatch.name !== undefined || categoryPatch.key !== undefined || categoryPatch.type !== undefined, {
            message: 'At least one category field must be provided.',
        }),
);

export const createRequirementSchema: ZodValidationSchema<CreateRequirementDto> = requirementRequestBodySchema.pipe(
    z.object({
        categoryId: categoryIdSchema,
        description: requirementTextSchema.optional(),
        priority: prioritySchema.optional(),
        owner: requirementTextSchema.optional(),
        rationale: requirementTextSchema.optional(),
        source: requirementTextSchema.optional(),
    }),
);

export const updateRequirementSchema: ZodValidationSchema<UpdateRequirementDto> = requirementRequestBodySchema.pipe(
    z
        .object({
            categoryId: categoryIdSchema.optional(),
            description: requirementTextSchema.optional(),
            priority: prioritySchema.optional(),
            owner: requirementTextSchema.optional(),
            rationale: requirementTextSchema.optional(),
            source: requirementTextSchema.optional(),
            changeReason: changeReasonSchema.optional(),
            status: requirementStatusSchema.optional(),
            reviewer: reviewerSchema.optional(),
            rejectionReason: rejectionReasonSchema.optional(),
            obsoletedBy: obsoletedBySchema.optional(),
            obsolescenceReason: obsolescenceReasonSchema.optional(),
        })
        .refine((requirementPatch) => hasAnyField(requirementPatch, CONTENT_UPDATE_FIELDS) || hasAnyField(requirementPatch, STATUS_UPDATE_FIELDS), {
            message: 'At least one requirement field must be provided.',
        })
        .refine((requirementPatch) => requirementPatch.status !== undefined || !hasAnyField(requirementPatch, STATUS_UPDATE_FIELDS), {
            message: 'Requirement status metadata can only be changed together with a status change.',
        })
        .refine((requirementPatch) => requirementPatch.status === undefined || !hasAnyField(requirementPatch, CONTENT_UPDATE_FIELDS), {
            message: 'Requirement content changes and status changes must be sent separately.',
        })
        .refine((requirementPatch) => requirementPatch.status !== undefined || requirementPatch[CHANGE_REASON_FIELD] !== undefined, {
            message: 'Change reason is required when changing requirement content or metadata.',
            path: [CHANGE_REASON_FIELD],
        })
        .refine((requirementPatch) => requirementPatch.status === undefined || requirementPatch[CHANGE_REASON_FIELD] === undefined, {
            message: 'Change reason is derived by the server for lifecycle transitions.',
            path: [CHANGE_REASON_FIELD],
        }),
);
