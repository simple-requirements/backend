import { z } from 'zod';

import type { ZodValidationSchema } from '@/common/pipes/zod-validation.pipe';
import type { CreateCategoryDto } from '@/projects/dto/create-category.dto';
import type { UpdateCategoryDto } from '@/projects/dto/update-category.dto';
import type { CreateProjectDto } from '@/projects/dto/create-project.dto';
import type { UpdateProjectDto } from '@/projects/dto/update-project.dto';
import { RequirementType } from '@/requirements/requirement-type.enum';

const CATEGORY_KEY_REGEX = /^[A-Z]{2,4}$/;

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

const projectNameSchema = trimmedStringSchema('Project name must be a string.', 'Project name must not be empty.');

const categoryNameSchema = trimmedStringSchema('Category name must be a string.', 'Category name must not be empty.');

const categoryKeySchema = z
    .custom<string>((value): value is string => typeof value === 'string', {
        message: 'Category key must be a string.',
    })
    .transform((value) => value.trim().toUpperCase())
    .refine((value) => CATEGORY_KEY_REGEX.test(value), {
        message: 'Category key must contain 2 to 4 uppercase letters.',
    });

const requirementTypeSchema = z.custom<RequirementType>(
    (value): value is RequirementType => value === RequirementType.FR || value === RequirementType.NFR,
    { message: 'Category type must be either FR or NFR.' },
);

const projectRequestBodySchema = requestBodySchema('Project request body must be an object.');
const categoryRequestBodySchema = requestBodySchema('Category request body must be an object.');

export const createProjectSchema: ZodValidationSchema<CreateProjectDto> = projectRequestBodySchema.pipe(
    z.object({ name: projectNameSchema }),
);

export const updateProjectSchema: ZodValidationSchema<UpdateProjectDto> = createProjectSchema;

export const createCategorySchema: ZodValidationSchema<CreateCategoryDto> = categoryRequestBodySchema.pipe(
    z.object({ name: categoryNameSchema, key: categoryKeySchema, type: requirementTypeSchema }),
);

export const updateCategorySchema: ZodValidationSchema<UpdateCategoryDto> = categoryRequestBodySchema.pipe(
    z
        .object({
            name: categoryNameSchema.optional(),
            key: categoryKeySchema.optional(),
            type: requirementTypeSchema.optional(),
        })
        .refine(
            (categoryPatch) =>
                categoryPatch.name !== undefined || categoryPatch.key !== undefined || categoryPatch.type !== undefined,
            { message: 'At least one category field must be provided.' },
        ),
);
