import { describe, expect, it } from 'vitest';

import { CategoryType } from '@/projects/category-type.enum';
import {
    createCategorySchema,
    createProjectSchema,
    createRequirementSchema,
    requirementRevisionQuerySchema,
    updateCategorySchema,
    updateRequirementSchema,
} from '@/projects/dto/project.schemas';
import { RequirementStatus } from '@/projects/requirement-status.enum';

const CATEGORY_ID = '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d10';

describe('project request schemas', () => {
    it('normalizes a project name.', () => {
        const result = createProjectSchema.parse({ name: '  Test project  ' });

        expect(result).toEqual({ name: 'Test project' });
    });

    it('normalizes a category name and key.', () => {
        const result = createCategorySchema.parse({
            name: '  Authentication  ',
            key: '  auth  ',
            type: CategoryType.FR,
        });

        expect(result).toEqual({ name: 'Authentication', key: 'AUTH', type: CategoryType.FR });
    });

    it('rejects an empty category patch.', () => {
        const result = updateCategorySchema.safeParse({});

        expect(result.success).toBe(false);

        if (result.success) {
            throw new Error('Expected Zod parsing to fail.');
        }

        expect(result.error.issues[0]?.message).toBe('At least one category field must be provided.');
    });

    it('rejects an invalid category key.', () => {
        const result = createCategorySchema.safeParse({ name: 'Authentication', key: 'A11Y', type: CategoryType.FR });

        expect(result.success).toBe(false);

        if (result.success) {
            throw new Error('Expected Zod parsing to fail.');
        }

        expect(result.error.issues[0]?.message).toBe('Category key must contain 2 to 4 uppercase letters.');
    });

    it('normalizes a requirement creation body.', () => {
        const result = createRequirementSchema.parse({
            categoryId: CATEGORY_ID,
            description: '  Users must sign in.  ',
            priority: ' P1 ',
            owner: '  Product Owner  ',
            rationale: '   ',
        });

        expect(result).toEqual({
            categoryId: CATEGORY_ID,
            description: 'Users must sign in.',
            priority: 'p1',
            owner: 'Product Owner',
            rationale: null,
        });
    });

    it('rejects a requirement body with an invalid category id.', () => {
        const result = createRequirementSchema.safeParse({ categoryId: 'not-a-uuid' });

        expect(result.success).toBe(false);

        if (result.success) {
            throw new Error('Expected Zod parsing to fail.');
        }

        expect(result.error.issues[0]?.message).toBe('Category id must be a valid UUID.');
    });

    it('allows a requirement status patch.', () => {
        const result = updateRequirementSchema.parse({
            status: RequirementStatus.Approved,
            reviewer: '  Jane Reviewer  ',
        });

        expect(result).toEqual({ status: RequirementStatus.Approved, reviewer: 'Jane Reviewer' });
    });

    it('rejects a requirement patch that mixes content and status changes.', () => {
        const result = updateRequirementSchema.safeParse({
            description: 'Changed text.',
            status: RequirementStatus.Approved,
            reviewer: 'Jane Reviewer',
        });

        expect(result.success).toBe(false);

        if (result.success) {
            throw new Error('Expected Zod parsing to fail.');
        }

        expect(result.error.issues[0]?.message).toBe(
            'Requirement content changes and status changes must be sent separately.',
        );
    });
    it('normalizes a requirement revision query.', () => {
        const result = requirementRevisionQuerySchema.parse({ revision: '2' });

        expect(result).toEqual({ revision: 2, allrevisions: false });
    });

    it('normalizes a requirement all revisions query.', () => {
        const result = requirementRevisionQuerySchema.parse({ allrevisions: '' });

        expect(result).toEqual({ allrevisions: true });
    });

    it('rejects mixing requirement revision query modes.', () => {
        const result = requirementRevisionQuerySchema.safeParse({ revision: '1', allrevisions: '' });

        expect(result.success).toBe(false);

        if (result.success) {
            throw new Error('Expected Zod parsing to fail.');
        }

        expect(result.error.issues[0]?.message).toBe('Use either revision or allrevisions, not both.');
    });

    it('rejects an invalid requirement revision query.', () => {
        const result = requirementRevisionQuerySchema.safeParse({ revision: '0' });

        expect(result.success).toBe(false);

        if (result.success) {
            throw new Error('Expected Zod parsing to fail.');
        }

        expect(result.error.issues[0]?.message).toBe('Revision query parameter must be a positive integer.');
    });
});
