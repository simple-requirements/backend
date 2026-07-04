import { randomUUID } from 'node:crypto';

import { expect, test } from '@/projects/projects-api.e2e-fixtures';

import { CategoryType } from '@/projects/category-type.enum';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import {
    expectErrorResponseBody,
    expectRequirementResponseBody,
    type ErrorResponseBody,
    type RequirementResponseBody,
} from '@/projects/projects-api.e2e-helpers';

test.describe('Requirement revisions API - GET /projects/{projectId}/requirements/{requirementId}', () => {
    test('returns a requirement by a specific revision number.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API get requirement revision project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id, 'Original draft.');

        const approveResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { status: RequirementStatus.Approved, reviewer: 'Jane Reviewer' },
        });
        expect(approveResponse.status()).toBe(200);

        const updateResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Current draft.' },
        });
        expect(updateResponse.status()).toBe(200);

        const firstRevisionResponse = await request.get(
            `/projects/${project.id}/requirements/${requirement.id}?revision=1`,
        );

        expect(firstRevisionResponse.status()).toBe(200);

        const firstRevision = (await firstRevisionResponse.json()) as RequirementResponseBody;

        expectRequirementResponseBody(firstRevision, {
            id: requirement.id,
            projectId: project.id,
            categoryId: category.id,
            revisionNumber: 1,
            status: RequirementStatus.Draft,
            description: 'Original draft.',
        });

        const currentRevisionResponse = await request.get(
            `/projects/${project.id}/requirements/${requirement.id}?revision=3`,
        );

        expect(currentRevisionResponse.status()).toBe(200);

        const currentRevision = (await currentRevisionResponse.json()) as RequirementResponseBody;

        expectRequirementResponseBody(currentRevision, {
            id: requirement.id,
            projectId: project.id,
            categoryId: category.id,
            revisionNumber: 3,
            status: RequirementStatus.Draft,
            description: 'Current draft.',
        });
    });

    test('returns all stored historical revisions of a requirement.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API all requirement revisions project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id, 'Original draft.');

        const approveResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { status: RequirementStatus.Approved, reviewer: 'Jane Reviewer' },
        });
        expect(approveResponse.status()).toBe(200);

        const updateResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Current draft.' },
        });
        expect(updateResponse.status()).toBe(200);

        const revisionsResponse = await request.get(
            `/projects/${project.id}/requirements/${requirement.id}?allrevisions`,
        );

        expect(revisionsResponse.status()).toBe(200);

        const revisions = (await revisionsResponse.json()) as readonly RequirementResponseBody[];

        expect(revisions.map((revision) => revision.revisionNumber)).toEqual([1, 2]);
        expect(revisions.map((revision) => revision.status)).toEqual([
            RequirementStatus.Draft,
            RequirementStatus.Approved,
        ]);
        expect(revisions.every((revision) => revision.id === requirement.id)).toBe(true);
    });

    test('rejects invalid requirement revision query parameters.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API invalid revision query project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id);

        const response = await request.get(`/projects/${project.id}/requirements/${requirement.id}?revision=0`);

        expect(response.status()).toBe(400);

        const body = (await response.json()) as ErrorResponseBody;

        expectErrorResponseBody(body, 400, 'Revision query parameter must be a positive integer.', 'Bad Request');
    });

    test('returns 404 when a requested historical revision does not exist.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API unknown revision project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id);

        const response = await request.get(`/projects/${project.id}/requirements/${requirement.id}?revision=99`);

        expect(response.status()).toBe(404);

        const body = (await response.json()) as ErrorResponseBody;

        expectErrorResponseBody(
            body,
            404,
            `Revision 99 of requirement "${requirement.id}" in project "${project.id}" was not found.`,
            'Not Found',
        );
    });
});
