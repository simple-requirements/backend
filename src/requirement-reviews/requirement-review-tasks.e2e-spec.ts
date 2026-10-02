import {
    E2E_ADMIN_HEADERS,
    E2E_REQUIREMENTS_ENGINEER_HEADERS,
    E2E_DEVELOPER_HEADERS,
    E2E_VIEWER_HEADERS,
    createProject,
    createCategory,
    createRequirement,
    type RequirementResponseBody,
} from '@/projects/projects-api.e2e-helpers';
import { test, expect } from '@/projects/projects-api.e2e-fixtures';
import {
    E2E_REVIEWER_ACCESS_TOKEN,
    E2E_REVIEWER_USER_ID,
    E2E_REQUIREMENTS_ENGINEER_USER_ID,
} from '@/database/seeding/seed-e2e-authentication';

const reviewerHeaders = { Authorization: `Bearer ${E2E_REVIEWER_ACCESS_TOKEN}` } as const;

test.describe('Requirement review tasks API', () => {
    test('assigns another project Requirements Engineer, exposes a personal pending task, and completes it without a requirement revision.', async ({
        request,
    }) => {
        const project = await createProject(request, 'Review task E2E project');
        expect(
            (
                await request.put(`/admin/projects/${project.id}/memberships/${E2E_REVIEWER_USER_ID}`, {
                    headers: E2E_ADMIN_HEADERS,
                })
            ).status(),
        ).toBe(200);
        const category = await createCategory(request, project.id, 'Authentication', 'AUTH');
        const requirement = await createRequirement(request, project.id, category.id, 'Needs independent review.');

        const assigneesResponse = await request.get(`/projects/${project.id}/review-assignees`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });
        expect(assigneesResponse.status()).toBe(200);
        expect(await assigneesResponse.json()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ userId: E2E_REVIEWER_USER_ID, displayName: 'Review Engineer' }),
            ]),
        );

        const assignResponse = await request.post(
            `/projects/${project.id}/requirements/${requirement.id}/review-tasks`,
            { headers: E2E_REQUIREMENTS_ENGINEER_HEADERS, data: { assigneeUserId: E2E_REVIEWER_USER_ID } },
        );
        expect(assignResponse.status()).toBe(201);
        const task = (await assignResponse.json()) as { id: string; status: string; requirementKey: string };
        expect(task).toMatchObject({ status: 'pending', requirementKey: requirement.visibleKey });

        const mineResponse = await request.get(`/projects/${project.id}/review-tasks`, { headers: reviewerHeaders });
        expect(mineResponse.status()).toBe(200);
        expect(await mineResponse.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id: task.id })]));

        const completeResponse = await request.patch(
            `/projects/${project.id}/requirements/${requirement.id}/review-tasks/${task.id}`,
            { headers: reviewerHeaders, data: { status: 'completed' } },
        );
        expect(completeResponse.status()).toBe(200);
        expect(await completeResponse.json()).toMatchObject({ id: task.id, status: 'completed' });

        const requirementResponse = await request.get(`/projects/${project.id}/requirements/${requirement.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });
        expect(requirementResponse.status()).toBe(200);
        expect(((await requirementResponse.json()) as RequirementResponseBody).revisionNumber).toBe(
            requirement.revisionNumber,
        );
    });

    test('allows project readers to inspect assignments but only Requirements Engineers can mutate them.', async ({
        request,
        draftRequirement,
    }) => {
        const { project, requirement } = draftRequirement;
        expect(
            (
                await request.get(`/projects/${project.id}/requirements/${requirement.id}/review-tasks`, {
                    headers: E2E_DEVELOPER_HEADERS,
                })
            ).status(),
        ).toBe(200);
        expect(
            (
                await request.get(`/projects/${project.id}/requirements/${requirement.id}/review-tasks`, {
                    headers: E2E_VIEWER_HEADERS,
                })
            ).status(),
        ).toBe(200);
        expect(
            (
                await request.post(`/projects/${project.id}/requirements/${requirement.id}/review-tasks`, {
                    headers: E2E_DEVELOPER_HEADERS,
                    data: { assigneeUserId: E2E_REQUIREMENTS_ENGINEER_USER_ID },
                })
            ).status(),
        ).toBe(403);
    });

    test('rejects self assignment.', async ({ request, draftRequirement }) => {
        const { project, requirement } = draftRequirement;
        const response = await request.post(`/projects/${project.id}/requirements/${requirement.id}/review-tasks`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { assigneeUserId: E2E_REQUIREMENTS_ENGINEER_USER_ID },
        });
        expect(response.status()).toBe(400);
    });
});
