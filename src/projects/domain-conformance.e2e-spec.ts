import { randomUUID } from 'node:crypto';

import {
    E2E_ADMIN_ACCESS_TOKEN,
    E2E_ADMIN_USER_ID,
    E2E_DEVELOPER_ACCESS_TOKEN,
    E2E_DEVELOPER_USER_ID,
    E2E_VIEWER_ACCESS_TOKEN,
} from '@/database/seeding/seed-e2e-authentication';
import { CategoryType } from '@/projects/category-type.enum';
import { test, expect } from '@/projects/projects-api.e2e-fixtures';
import { E2E_ADMIN_HEADERS, E2E_REQUIREMENTS_ENGINEER_HEADERS } from '@/projects/projects-api.e2e-helpers';
import { RequirementStatus } from '@/projects/requirement-status.enum';

const DEVELOPER_HEADERS = { Authorization: `Bearer ${E2E_DEVELOPER_ACCESS_TOKEN}` } as const;

const VIEWER_HEADERS = { Authorization: `Bearer ${E2E_VIEWER_ACCESS_TOKEN}` } as const;

const ADMIN_HEADERS = { Authorization: `Bearer ${E2E_ADMIN_ACCESS_TOKEN}` } as const;

test.describe('Domain conformance - authorization boundaries', () => {
    test('Administrator cannot access project content or receive project membership.', async ({ request, api }) => {
        const project = await api.createProject(`Conformance administrator isolation ${randomUUID()}`);

        const contentResponse = await request.get(`/projects/${project.id}/requirements`, { headers: ADMIN_HEADERS });
        expect(contentResponse.status()).toBe(403);

        const membershipResponse = await request.put(`/admin/projects/${project.id}/memberships/${E2E_ADMIN_USER_ID}`, {
            headers: E2E_ADMIN_HEADERS,
        });
        expect(membershipResponse.status()).toBe(400);
    });

    test('a project-scoped account loses access immediately when its membership is removed.', async ({
        request,
        api,
    }) => {
        const project = await api.createProject(`Conformance membership boundary ${randomUUID()}`);

        const removeResponse = await request.delete(
            `/admin/projects/${project.id}/memberships/${E2E_DEVELOPER_USER_ID}`,
            { headers: E2E_ADMIN_HEADERS },
        );
        expect(removeResponse.status()).toBe(204);

        const projectResponse = await request.get(`/projects/${project.id}`, { headers: DEVELOPER_HEADERS });
        expect(projectResponse.status()).toBe(403);
    });

    test('Developer cannot mutate categories, requirement content, reviews, or lifecycle state.', async ({
        request,
        draftRequirement,
    }) => {
        const { project, category, requirement } = draftRequirement;

        const categoryResponse = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
            data: { name: 'Developer mutation' },
            headers: DEVELOPER_HEADERS,
        });
        expect(categoryResponse.status()).toBe(403);

        const requirementResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Developer mutation', changeReason: 'This request must be denied.' },
            headers: DEVELOPER_HEADERS,
        });
        expect(requirementResponse.status()).toBe(403);

        const reviewResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
            { data: { text: 'Developer review attempt' }, headers: DEVELOPER_HEADERS },
        );
        expect(reviewResponse.status()).toBe(403);

        const approveResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/review/approve`,
            { headers: DEVELOPER_HEADERS },
        );
        expect(approveResponse.status()).toBe(403);
    });

    test('Viewer is read-only for assigned project content.', async ({ request, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        const readResponse = await request.get(`/projects/${project.id}/requirements/${requirement.id}`, {
            headers: VIEWER_HEADERS,
        });
        expect(readResponse.status()).toBe(200);

        const updateResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Viewer mutation', changeReason: 'This request must be denied.' },
            headers: VIEWER_HEADERS,
        });
        expect(updateResponse.status()).toBe(403);

        const ticketResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/implementation-tickets`,
            { data: { ticketId: 'VIEW-1', completedBy: 'Viewer', completedAt: '2026-09-14' }, headers: VIEWER_HEADERS },
        );
        expect(ticketResponse.status()).toBe(403);
    });
});

test.describe('Domain conformance - lifecycle and revision boundaries', () => {
    test('generic requirement PATCH cannot approve or reject a draft.', async ({ request, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        const approveResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { status: RequirementStatus.Approved },
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });
        expect(approveResponse.status()).toBe(400);

        const rejectResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { status: RequirementStatus.Rejected, rejectionReason: 'Rejected through an invalid entry point.' },
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });
        expect(rejectResponse.status()).toBe(400);
    });

    test('approved requirements remain approved after a substantive content edit.', async ({
        request,
        draftRequirement,
        api,
    }) => {
        const { project, requirement } = draftRequirement;
        const approved = await api.approveRequirement(project.id, requirement.id);
        expect(approved.status).toBe(RequirementStatus.Approved);

        const updateResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Updated approved wording.', changeReason: 'Clarified the approved requirement.' },
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });
        expect(updateResponse.status()).toBe(200);

        const updated = (await updateResponse.json()) as {
            status: RequirementStatus;
            revisionNumber: number;
            changeType: string;
            changeReason: string;
        };
        expect(updated).toMatchObject({
            status: RequirementStatus.Approved,
            revisionNumber: approved.revisionNumber + 1,
            changeType: 'content_changed',
            changeReason: 'Clarified the approved requirement.',
        });
    });

    test('Developer can create implementation tickets only after approval.', async ({
        request,
        draftRequirement,
        api,
    }) => {
        const { project, requirement } = draftRequirement;

        const draftTicketResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/implementation-tickets`,
            {
                data: { ticketId: 'DEV-DRAFT', completedBy: 'Developer', completedAt: '2026-09-14' },
                headers: DEVELOPER_HEADERS,
            },
        );
        expect(draftTicketResponse.status()).toBe(400);

        await api.approveRequirement(project.id, requirement.id);

        const approvedTicketResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/implementation-tickets`,
            {
                data: { ticketId: 'DEV-APPROVED', completedBy: 'Developer', completedAt: '2026-09-14' },
                headers: DEVELOPER_HEADERS,
            },
        );
        expect(approvedTicketResponse.status()).toBe(201);
    });

    test('Administrator API remains separate from project-scoped category creation.', async ({ request, api }) => {
        const project = await api.createProject(`Conformance administrator content boundary ${randomUUID()}`);

        const response = await request.post(`/projects/${project.id}/categories`, {
            data: { name: 'Administrator forbidden category', key: 'AFC', type: CategoryType.FR },
            headers: E2E_ADMIN_HEADERS,
        });

        expect(response.status()).toBe(403);
    });
});
