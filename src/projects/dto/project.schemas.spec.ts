import { describe, expect, it } from 'vitest';

import { CategoryType } from '@/projects/category-type.enum';
import {
    createCategorySchema,
    createProjectSchema,
    createRequirementSchema,
    implementationTicketSchema,
    updateCategorySchema,
    updateProjectSchema,
    updateRequirementSchema,
} from '@/projects/dto/project.schemas';
import { RequirementStatus } from '@/projects/requirement-status.enum';

const CATEGORY_ID = '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d10';

describe('project request schemas', () => {
    it('normalizes a project name.', () => {
        const result = createProjectSchema.parse({ name: '  Test project  ' });

        expect(result).toEqual({ name: 'Test project' });
    });

    it('accepts an absolute ticket URL template with exactly one placeholder.', () => {
        expect(updateProjectSchema.parse({ ticketUrlTemplate: ' https://github.com/acme/issues/{ticket-id} ' }))
            .toEqual({ ticketUrlTemplate: 'https://github.com/acme/issues/{ticket-id}' });
    });

    it('rejects a ticket URL template without the ticket placeholder.', () => {
        expect(updateProjectSchema.safeParse({ ticketUrlTemplate: 'https://github.com/acme/issues' }).success).toBe(false);
    });

    it('normalizes an implementation ticket and treats the actor as server-derived.', () => {
        expect(implementationTicketSchema.parse({
            ticketId: ' SOLAR-4711 ', completedBy: ' Ada Lovelace ', completedAt: '2026-08-26',
        })).toEqual({ ticketId: 'SOLAR-4711', completedBy: 'Ada Lovelace', completedAt: '2026-08-26' });
        expect(implementationTicketSchema.parse({
            ticketId: ' SOLAR-4712 ', completedAt: '2026-08-27',
        })).toEqual({ ticketId: 'SOLAR-4712', completedBy: '__server_derived_actor__', completedAt: '2026-08-27' });
    });

    it('normalizes a category name and key.', () => {
        const result = createCategorySchema.parse({
            name: '  Authentication  ',
            key: '  auth  ',
            type: CategoryType.FR,
        });

        expect(result).toEqual({
            name: 'Authentication',
            key: 'AUTH',
            type: CategoryType.FR,
        });
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
        const result = createCategorySchema.safeParse({
            name: 'Authentication',
            key: 'A11Y',
            type: CategoryType.FR,
        });

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
        const result = createRequirementSchema.safeParse({
            categoryId: 'not-a-uuid',
        });

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

        expect(result).toEqual({
            status: RequirementStatus.Approved,
            reviewer: 'Jane Reviewer',
        });
    });

    it('normalizes dedicated obsolescence metadata in a status patch.', () => {
        const result = updateRequirementSchema.parse({
            status: RequirementStatus.Obsolete,
            obsoletedBy: '  Olivia Owner  ',
            obsolescenceReason: '  Superseded by FR-AUTH-0002.  ',
        });

        expect(result).toEqual({
            status: RequirementStatus.Obsolete,
            obsoletedBy: 'Olivia Owner',
            obsolescenceReason: 'Superseded by FR-AUTH-0002.',
        });
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

        expect(result.error.issues[0]?.message).toBe('Requirement content changes and status changes must be sent separately.');
    });

});
