import { randomUUID } from 'node:crypto';

import { CategoryType } from '@/projects/category-type.enum';
import {
    expectErrorResponseBody,
    expectIsoDateString,
    expectNullableIsoDateString,
    expectRequirementResponseBody,
    type ErrorResponseBody,
    type RequirementResponseBody,
} from '@/projects/projects-api.e2e-helpers';
import { test, expect } from '@/projects/projects-api.e2e-fixtures';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import { RequirementReviewCommentCloseReason } from '@/requirement-reviews/requirement-review-comment-close-reason.enum';
import { RequirementReviewCommentStatus } from '@/requirement-reviews/requirement-review-comment-status.enum';

interface RequirementReviewCommentResponseBody {
    id: string;
    projectId: string;
    requirementId: string;
    createdForRevisionNumber: number;
    text: string;
    status: RequirementReviewCommentStatus;
    author: string;
    closedBy: string | null;
    closeReason: RequirementReviewCommentCloseReason | null;
    closedInRevisionNumber: number | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

function expectReviewCommentResponseBody(
    body: RequirementReviewCommentResponseBody,
    expected: Readonly<{
        projectId: string;
        requirementId: string;
        createdForRevisionNumber?: number;
        text?: string;
        status?: RequirementReviewCommentStatus;
        author?: string;
        closedBy?: string | null;
        closeReason?: RequirementReviewCommentCloseReason | null;
        closedInRevisionNumber?: number | null;
    }>,
): void {
    expect(body.projectId).toBe(expected.projectId);
    expect(body.requirementId).toBe(expected.requirementId);

    if (expected.createdForRevisionNumber !== undefined) {
        expect(body.createdForRevisionNumber).toBe(expected.createdForRevisionNumber);
    }

    if (expected.text !== undefined) {
        expect(body.text).toBe(expected.text);
    }

    if (expected.status !== undefined) {
        expect(body.status).toBe(expected.status);
    }

    if (expected.author !== undefined) {
        expect(body.author).toBe(expected.author);
    }

    if (expected.closedBy !== undefined) {
        expect(body.closedBy).toBe(expected.closedBy);
    }

    if (expected.closeReason !== undefined) {
        expect(body.closeReason).toBe(expected.closeReason);
    }

    if (expected.closedInRevisionNumber !== undefined) {
        expect(body.closedInRevisionNumber).toBe(expected.closedInRevisionNumber);
    }

    expectIsoDateString(body.createdAt);
    expectIsoDateString(body.updatedAt);
    expectNullableIsoDateString(body.closedAt);
}

test.describe('Requirement reviews API - POST /projects/{projectId}/requirements/{requirementId}/review-comments', () => {
    test('creates and lists open review comments for a draft requirement.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API review comments project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id);

        const createResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
            { data: { text: 'Please define allowed authentication methods.', author: 'Jane Reviewer' } },
        );

        expect(createResponse.status()).toBe(201);

        const createdComment = (await createResponse.json()) as RequirementReviewCommentResponseBody;

        expectReviewCommentResponseBody(createdComment, {
            projectId: project.id,
            requirementId: requirement.id,
            createdForRevisionNumber: 1,
            text: 'Please define allowed authentication methods.',
            status: RequirementReviewCommentStatus.Open,
            author: 'Jane Reviewer',
            closedBy: null,
            closeReason: null,
            closedInRevisionNumber: null,
        });

        const listResponse = await request.get(`/projects/${project.id}/requirements/${requirement.id}/review-comments`);

        expect(listResponse.status()).toBe(200);

        const listedComments = (await listResponse.json()) as readonly RequirementReviewCommentResponseBody[];

        expect(listedComments.map((comment) => comment.id)).toContain(createdComment.id);
    });
});

test.describe('Requirement reviews API - PATCH /projects/{projectId}/requirements/{requirementId}/review-comments/{commentId}', () => {
    test('closes an open review comment.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API close review comment project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id);
        const createResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
            { data: { text: 'Please define allowed authentication methods.', author: 'Jane Reviewer' } },
        );
        const comment = (await createResponse.json()) as RequirementReviewCommentResponseBody;

        const closeResponse = await request.patch(
            `/projects/${project.id}/requirements/${requirement.id}/review-comments/${comment.id}`,
            { data: { closedBy: 'Jane Reviewer' } },
        );

        expect(closeResponse.status()).toBe(200);

        const closedComment = (await closeResponse.json()) as RequirementReviewCommentResponseBody;

        expectReviewCommentResponseBody(closedComment, {
            projectId: project.id,
            requirementId: requirement.id,
            status: RequirementReviewCommentStatus.Closed,
            closedBy: 'Jane Reviewer',
            closeReason: RequirementReviewCommentCloseReason.Resolved,
            closedInRevisionNumber: 1,
        });
        expect(closedComment.closedAt).not.toBeNull();
    });
});

test.describe('Requirement reviews API - POST /projects/{projectId}/requirements/{requirementId}/review/approve', () => {
    test('does not approve requirements while review comments are open.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API approve blocked project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id);

        const createCommentResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
            { data: { text: 'Please clarify the acceptance criteria.', author: 'Jane Reviewer' } },
        );
        expect(createCommentResponse.status()).toBe(201);

        const approveResponse = await request.post(`/projects/${project.id}/requirements/${requirement.id}/review/approve`, {
            data: { reviewer: 'Jane Reviewer' },
        });

        expect(approveResponse.status()).toBe(400);

        const body = (await approveResponse.json()) as ErrorResponseBody;

        expectErrorResponseBody(
            body,
            400,
            'Requirement cannot be approved while review comments are open.',
            'Bad Request',
        );
    });

    test('approves requirements when all review comments are closed.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API approve reviewed project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id);
        const createCommentResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
            { data: { text: 'Please clarify the acceptance criteria.', author: 'Jane Reviewer' } },
        );
        const comment = (await createCommentResponse.json()) as RequirementReviewCommentResponseBody;
        const closeResponse = await request.patch(
            `/projects/${project.id}/requirements/${requirement.id}/review-comments/${comment.id}`,
            { data: { closedBy: 'Jane Reviewer' } },
        );
        expect(closeResponse.status()).toBe(200);

        const approveResponse = await request.post(`/projects/${project.id}/requirements/${requirement.id}/review/approve`, {
            data: { reviewer: 'Jane Reviewer' },
        });

        expect(approveResponse.status()).toBe(200);

        const approvedRequirement = (await approveResponse.json()) as RequirementResponseBody;

        expectRequirementResponseBody(approvedRequirement, {
            id: requirement.id,
            projectId: project.id,
            categoryId: category.id,
            revisionNumber: 2,
            status: RequirementStatus.Approved,
        });
        expect(approvedRequirement.reviewer).toBe('Jane Reviewer');
        expect(approvedRequirement.approvedAt).not.toBeNull();
    });
});

test.describe('Requirement reviews API - POST /projects/{projectId}/requirements/{requirementId}/review/reject', () => {
    test('rejects a requirement and auto-closes open review comments.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API reject reviewed project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id);
        const createCommentResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
            { data: { text: 'Please clarify the acceptance criteria.', author: 'Jane Reviewer' } },
        );
        const comment = (await createCommentResponse.json()) as RequirementReviewCommentResponseBody;

        const rejectResponse = await request.post(`/projects/${project.id}/requirements/${requirement.id}/review/reject`, {
            data: { reviewer: 'Jane Reviewer', rejectionReason: 'The requirement is not testable.' },
        });

        expect(rejectResponse.status()).toBe(200);

        const rejectedRequirement = (await rejectResponse.json()) as RequirementResponseBody;

        expectRequirementResponseBody(rejectedRequirement, {
            id: requirement.id,
            projectId: project.id,
            categoryId: category.id,
            revisionNumber: 2,
            status: RequirementStatus.Rejected,
        });
        expect(rejectedRequirement.reviewer).toBe('Jane Reviewer');
        expect(rejectedRequirement.rejectionReason).toBe('The requirement is not testable.');
        expect(rejectedRequirement.rejectedAt).not.toBeNull();

        const listResponse = await request.get(`/projects/${project.id}/requirements/${requirement.id}/review-comments`);
        const listedComments = (await listResponse.json()) as readonly RequirementReviewCommentResponseBody[];
        const rejectedClosedComment = listedComments.find((listedComment) => listedComment.id === comment.id);

        expect(rejectedClosedComment).toBeDefined();
        expect(rejectedClosedComment?.status).toBe(RequirementReviewCommentStatus.Closed);
        expect(rejectedClosedComment?.closedBy).toBe('Jane Reviewer');
        expect(rejectedClosedComment?.closeReason).toBe(RequirementReviewCommentCloseReason.RequirementRejected);
        expect(rejectedClosedComment?.closedInRevisionNumber).toBe(2);
    });
});
