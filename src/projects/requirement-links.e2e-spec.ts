import { randomUUID } from 'node:crypto';

import { CategoryType } from '@/projects/category-type.enum';
import { expect, test, type ProjectsApiFixture } from '@/projects/projects-api.e2e-fixtures';
import {
    E2E_ADMIN_HEADERS,
    E2E_DEVELOPER_HEADERS,
    E2E_REQUIREMENTS_ENGINEER_HEADERS,
    E2E_VIEWER_HEADERS,
} from '@/projects/projects-api.e2e-helpers';

type LinkBody = Readonly<{
    id: string;
    projectId: string;
    relationshipType: 'references';
    source: Readonly<{
        requirementId: string;
        visibleKey: string;
        type: 'FR' | 'NFR';
        categoryId: string;
        categoryName: string;
        status: string;
    }>;
    target: Readonly<{
        requirementId: string;
        visibleKey: string;
        type: 'FR' | 'NFR';
        categoryId: string;
        categoryName: string;
        status: string;
    }>;
}>;

type OverviewBody = Readonly<{ outgoing: LinkBody[]; incoming: LinkBody[] }>;

async function setupLinkedRequirements(api: ProjectsApiFixture) {
    const project = await api.createProject(`Requirement links ${randomUUID()}`);
    const functional = await api.createCategory(project.id, 'Functional', 'FUNC', CategoryType.FR);
    const quality = await api.createCategory(project.id, 'Performance', 'PERF', CategoryType.NFR);
    const source = await api.createRequirement(project.id, functional.id, 'Source text mentions nothing.');
    const firstTarget = await api.createRequirement(project.id, quality.id, 'First target.');
    const secondTarget = await api.createRequirement(project.id, functional.id, 'Second target.');
    return { project, source, firstTarget, secondTarget };
}

test.describe('Requirement links API', () => {
    test('creates structured many-to-many links and exposes incoming/outgoing details.', async ({ request, api }) => {
        const { project, source, firstTarget, secondTarget } = await setupLinkedRequirements(api);

        const firstCreate = await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { targetKey: firstTarget.visibleKey },
        });
        expect(firstCreate.status()).toBe(201);
        const first = (await firstCreate.json()) as LinkBody;
        expect(first.relationshipType).toBe('references');
        expect(first.source.requirementId).toBe(source.id);
        expect(first.target.requirementId).toBe(firstTarget.id);
        expect(first.target.visibleKey).toBe(firstTarget.visibleKey);
        expect(first.target.type).toBe('NFR');
        expect(first.target.categoryName).toBe('Performance');

        const secondCreate = await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { targetKey: secondTarget.visibleKey },
        });
        expect(secondCreate.status()).toBe(201);

        const outgoingResponse = await request.get(`/projects/${project.id}/requirements/${source.id}/links`, {
            headers: E2E_VIEWER_HEADERS,
        });
        expect(outgoingResponse.status()).toBe(200);
        const outgoing = (await outgoingResponse.json()) as OverviewBody;
        expect(outgoing.outgoing.map((link) => link.target.visibleKey)).toEqual([
            firstTarget.visibleKey,
            secondTarget.visibleKey,
        ]);
        expect(outgoing.incoming).toEqual([]);

        const incomingResponse = await request.get(`/projects/${project.id}/requirements/${firstTarget.id}/links`, {
            headers: E2E_DEVELOPER_HEADERS,
        });
        expect(incomingResponse.status()).toBe(200);
        const incoming = (await incomingResponse.json()) as OverviewBody;
        expect(incoming.incoming).toHaveLength(1);
        expect(incoming.incoming[0]?.source.visibleKey).toBe(source.visibleKey);
    });

    test('blocks self-links, duplicate links, and unknown or cross-project target keys.', async ({ request, api }) => {
        const { project, source, firstTarget } = await setupLinkedRequirements(api);
        const otherProject = await api.createProject(`Other links ${randomUUID()}`);
        const otherCategory = await api.createCategory(otherProject.id, 'Other', 'OTHR');
        const otherRequirement = await api.createRequirement(otherProject.id, otherCategory.id, 'Other project.');

        expect(
            (
                await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
                    headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
                    data: { targetKey: source.visibleKey },
                })
            ).status(),
        ).toBe(400);

        expect(
            (
                await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
                    headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
                    data: { targetKey: 'FR-NONE-9999' },
                })
            ).status(),
        ).toBe(404);

        expect(
            (
                await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
                    headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
                    data: { targetKey: otherRequirement.visibleKey },
                })
            ).status(),
        ).toBe(404);

        const create = await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { targetKey: firstTarget.visibleKey },
        });
        expect(create.status()).toBe(201);
        expect(
            (
                await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
                    headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
                    data: { targetKey: firstTarget.visibleKey },
                })
            ).status(),
        ).toBe(400);
    });

    test('corrects and removes links without changing requirement content.', async ({ request, api }) => {
        const { project, source, firstTarget, secondTarget } = await setupLinkedRequirements(api);
        const createResponse = await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { targetKey: firstTarget.visibleKey },
        });
        const link = (await createResponse.json()) as LinkBody;

        const updateResponse = await request.patch(
            `/projects/${project.id}/requirements/${source.id}/links/${link.id}`,
            {
                headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
                data: { targetKey: secondTarget.visibleKey },
            },
        );
        expect(updateResponse.status()).toBe(200);
        expect(((await updateResponse.json()) as LinkBody).target.requirementId).toBe(secondTarget.id);

        const sourceResponse = await request.get(`/projects/${project.id}/requirements/${source.id}`, {
            headers: E2E_VIEWER_HEADERS,
        });
        expect(sourceResponse.status()).toBe(200);
        expect(((await sourceResponse.json()) as { description: string }).description).toBe('Source text mentions nothing.');

        const deleteResponse = await request.delete(
            `/projects/${project.id}/requirements/${source.id}/links/${link.id}`,
            { headers: E2E_REQUIREMENTS_ENGINEER_HEADERS },
        );
        expect(deleteResponse.status()).toBe(204);
        const overview = (await (
            await request.get(`/projects/${project.id}/requirements/${source.id}/links`, {
                headers: E2E_VIEWER_HEADERS,
            })
        ).json()) as OverviewBody;
        expect(overview.outgoing).toEqual([]);
    });

    test('keeps structured links independent from requirement description text.', async ({ request, api }) => {
        const { project, source, firstTarget } = await setupLinkedRequirements(api);

        const mentionResponse = await request.patch(`/projects/${project.id}/requirements/${source.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: {
                description: `Textual mention ${firstTarget.visibleKey} does not create a link.`,
                changeReason: 'Mention another requirement in prose.',
            },
        });
        expect(mentionResponse.status()).toBe(200);
        const afterMention = (await (
            await request.get(`/projects/${project.id}/requirements/${source.id}/links`, {
                headers: E2E_VIEWER_HEADERS,
            })
        ).json()) as OverviewBody;
        expect(afterMention.outgoing).toEqual([]);

        const createResponse = await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { targetKey: firstTarget.visibleKey },
        });
        expect(createResponse.status()).toBe(201);

        const removeMentionResponse = await request.patch(`/projects/${project.id}/requirements/${source.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { description: 'The prose mention was removed.', changeReason: 'Remove prose mention.' },
        });
        expect(removeMentionResponse.status()).toBe(200);
        const afterTextRemoval = (await (
            await request.get(`/projects/${project.id}/requirements/${source.id}/links`, {
                headers: E2E_VIEWER_HEADERS,
            })
        ).json()) as OverviewBody;
        expect(afterTextRemoval.outgoing).toHaveLength(1);
        expect(afterTextRemoval.outgoing[0]?.target.requirementId).toBe(firstTarget.id);
    });

    test('allows Developer and Viewer to read, but only Requirements Engineer can mutate; Administrator has no access.', async ({ request, api }) => {
        const { project, source, firstTarget, secondTarget } = await setupLinkedRequirements(api);
        const createResponse = await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { targetKey: firstTarget.visibleKey },
        });
        const link = (await createResponse.json()) as LinkBody;

        for (const headers of [E2E_DEVELOPER_HEADERS, E2E_VIEWER_HEADERS]) {
            expect((await request.get(`/projects/${project.id}/requirements/${source.id}/links`, { headers })).status()).toBe(200);
            expect(
                (
                    await request.post(`/projects/${project.id}/requirements/${source.id}/links`, {
                        headers,
                        data: { targetKey: secondTarget.visibleKey },
                    })
                ).status(),
            ).toBe(403);
            expect(
                (
                    await request.patch(`/projects/${project.id}/requirements/${source.id}/links/${link.id}`, {
                        headers,
                        data: { targetKey: secondTarget.visibleKey },
                    })
                ).status(),
            ).toBe(403);
            expect(
                (
                    await request.delete(`/projects/${project.id}/requirements/${source.id}/links/${link.id}`, {
                        headers,
                    })
                ).status(),
            ).toBe(403);
        }

        expect(
            (
                await request.get(`/projects/${project.id}/requirements/${source.id}/links`, {
                    headers: E2E_ADMIN_HEADERS,
                })
            ).status(),
        ).toBe(403);
    });
});
