import { describe, expect, it } from 'vitest';

import { createCategorySchema, createProjectSchema, updateCategorySchema } from '@/projects/dto/project.schemas';
import { RequirementType } from '@/requirements/requirement-type.enum';

describe('project request schemas', () => {
    it('normalizes a project name.', () => {
        const result = createProjectSchema.parse({ name: '  Test project  ' });

        expect(result).toEqual({ name: 'Test project' });
    });

    it('normalizes a category name and key.', () => {
        const result = createCategorySchema.parse({
            name: '  Authentication  ',
            key: '  auth  ',
            type: RequirementType.FR,
        });

        expect(result).toEqual({ name: 'Authentication', key: 'AUTH', type: RequirementType.FR });
    });

    it('rejects an empty category patch.', () => {
        const result = updateCategorySchema.safeParse({});

        expect(result.success).toBe(false);

        if (result.success === true) {
            throw new Error('Expected Zod parsing to fail.');
        }

        expect(result.error.issues[0]?.message).toBe('At least one category field must be provided.');
    });

    it('rejects an invalid category key.', () => {
        const result = createCategorySchema.safeParse({
            name: 'Authentication',
            key: 'A11Y',
            type: RequirementType.FR,
        });

        expect(result.success).toBe(false);

        if (result.success === true) {
            throw new Error('Expected Zod parsing to fail.');
        }

        expect(result.error.issues[0]?.message).toBe('Category key must contain 2 to 4 uppercase letters.');
    });
});
