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
            data: { description: 'Current draft.', changeReason: 'Updated draft wording.' },
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
        expect(revisions.map((revision) => revision.changeType)).toEqual([
            'requirement_created',
            'approved',
            'content_changed',
        ]);
        expect(revisions.map((revision) => revision.changeReason)).toEqual([
            'Requirement created.',
            'Requirement approved.',
            'Updated draft wording.',
        ]);
        expect(revisions.every((revision) => revision.id === requirement.id)).toBe(true);
        expect(revisions.every((revision) => !('deletedAt' in revision))).toBe(true);
    });


    test('documents the revision comparison response in OpenAPI.', async ({ request }) => {
        const response = await request.get('/api/docs-json');

        expect(response.status()).toBe(200);

        const document = (await response.json()) as {
            readonly paths: Record<
                string,
                {
                    readonly get?: {
                        readonly responses?: Record<
                            string,
                            {
                                readonly content?: {
                                    readonly 'application/json'?: {
                                        readonly schema?: { readonly $ref?: string };
                                    };
                                };
                            }
                        >;
                    };
                }
            >;
        };
        const schema =
            document.paths['/projects/{projectId}/requirements/{requirementId}/revisions/compare']?.get?.responses?.[
                '200'
            ]?.content?.['application/json']?.schema;

        expect(schema?.$ref).toBe('#/components/schemas/RequirementRevisionComparisonDto');
    });

    test('compares two requirement revisions.', async ({ request, api, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        await api.approveRequirement(project.id, requirement.id);

        const updateResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Current draft.', changeReason: 'Updated draft wording.' },
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

    test('creates revisions for implementation-ticket changes and compares ticket snapshots.', async ({ request, api, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        await api.approveRequirement(project.id, requirement.id);
        await api.createImplementationTicket(project.id, requirement.id, 'SOLAR-4711');

        const revisionsResponse = await request.get(
            `/projects/${project.id}/requirements/${requirement.id}/revisions`,
        );
        expect(revisionsResponse.status()).toBe(200);

        const revisions = (await revisionsResponse.json()) as readonly RequirementResponseBody[];
        expect(revisions.map((revision) => revision.revisionNumber)).toEqual([1, 2, 3]);
        expect(revisions[1]?.implementationTickets).toEqual([]);
        expect(revisions[2]?.implementationTickets).toEqual([
            expect.objectContaining({ ticketId: 'SOLAR-4711' }),
        ]);
        expect(revisions[2]?.changeType).toBe('implementation_ticket_created');
        expect(revisions[2]?.changeReason).toBe('Implementation ticket SOLAR-4711 created.');

        const compareResponse = await request.get(
            `/projects/${project.id}/requirements/${requirement.id}/revisions/compare?from=2&to=3`,
        );
        expect(compareResponse.status()).toBe(200);

        const body = (await compareResponse.json()) as {
            readonly differences: readonly { readonly field: string }[];
        };
        expect(body.differences.map((difference) => difference.field)).toContain('implementationTickets');
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
