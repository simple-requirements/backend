import { expect, test } from '@/projects/projects-api.e2e-fixtures';

import { RequirementStatus } from '@/projects/requirement-status.enum';
import {
    expectErrorResponseBody,
    type ErrorResponseBody,
    type RequirementResponseBody,
} from '@/projects/projects-api.e2e-helpers';

test.describe('Requirement revisions API', () => {
    test('returns immutable revisions including the current requirement revision.', async ({ request, api, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        await api.approveRequirement(project.id, requirement.id);

        const updateResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Current draft.' },
        });
        expect(updateResponse.status()).toBe(200);

        const revisionsResponse = await request.get(
            `/projects/${project.id}/requirements/${requirement.id}/revisions`,
        );

        expect(revisionsResponse.status()).toBe(200);

        const revisions = (await revisionsResponse.json()) as readonly RequirementResponseBody[];

        expect(revisions.map((revision) => revision.revisionNumber)).toEqual([1, 2, 3]);
        expect(revisions.map((revision) => revision.status)).toEqual([
            RequirementStatus.Draft,
            RequirementStatus.Approved,
            RequirementStatus.Draft,
        ]);
        expect(revisions.map((revision) => revision.description)).toEqual([
            'Original draft.',
            'Original draft.',
            'Current draft.',
        ]);
        expect(revisions.every((revision) => revision.id === requirement.id)).toBe(true);
    });

    test('compares two requirement revisions.', async ({ request, api, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        await api.approveRequirement(project.id, requirement.id);

        const updateResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Current draft.' },
        });
        expect(updateResponse.status()).toBe(200);

        const compareResponse = await request.get(
            `/projects/${project.id}/requirements/${requirement.id}/revisions/compare?from=1&to=3`,
        );

        expect(compareResponse.status()).toBe(200);

        const body = (await compareResponse.json()) as {
            readonly projectId: string;
            readonly requirementId: string;
            readonly fromRevision: number;
            readonly toRevision: number;
            readonly differences: readonly { readonly field: string }[];
        };

        expect(body).toMatchObject({
            projectId: project.id,
            requirementId: requirement.id,
            fromRevision: 1,
            toRevision: 3,
        });
        expect(body.differences.map((difference) => difference.field)).toContain('description');
    });

    test('rejects invalid revision comparison parameters.', async ({ request, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        const response = await request.get(
            `/projects/${project.id}/requirements/${requirement.id}/revisions/compare?from=0&to=1`,
        );

        expect(response.status()).toBe(400);

        const body = (await response.json()) as ErrorResponseBody;

        expectErrorResponseBody(
            body,
            400,
            'Revision comparison requires positive integer revision numbers.',
            'Bad Request',
        );
    });

    test('returns 404 when a compared revision does not exist.', async ({ request, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        const response = await request.get(
            `/projects/${project.id}/requirements/${requirement.id}/revisions/compare?from=1&to=99`,
        );

        expect(response.status()).toBe(404);

        const body = (await response.json()) as ErrorResponseBody;

        expectErrorResponseBody(
            body,
            404,
            `One or both requested revisions of requirement "${requirement.id}" were not found.`,
            'Not Found',
        );
    });
});
