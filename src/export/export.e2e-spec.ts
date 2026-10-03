import { randomUUID } from 'node:crypto';

import {
    E2E_ADMIN_HEADERS,
    E2E_DEVELOPER_HEADERS,
    E2E_REQUIREMENTS_ENGINEER_HEADERS,
} from '@/projects/projects-api.e2e-helpers';
import { expect, test } from '@/projects/projects-api.e2e-fixtures';

type ExportBody = Readonly<{
    schemaVersion: string;
    formatId: string;
    scope: string;
    warnings: readonly unknown[];
    projects: readonly {
        project: { id: string };
        requirements: readonly {
            id: string;
            visibleKey: string;
            description: string | null;
            renderedDescription: string | null;
            revisions: readonly { revisionNumber: number; renderedDescription: string | null }[];
        }[];
        metrics: readonly { key: string; value: string }[];
        requirementLinks: readonly { sourceRequirementKey: string; targetRequirementKey: string }[];
    }[];
}>;

test.describe('Export API', () => {
    test('discovers the first-release adapters.', async ({ request }) => {
        const response = await request.get('/export/formats', { headers: E2E_REQUIREMENTS_ENGINEER_HEADERS });
        expect(response.status()).toBe(200);
        expect((await response.json()) as unknown[]).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: 'json', formatClass: 'data' }),
                expect.objectContaining({ id: 'markdown', formatClass: 'document' }),
                expect.objectContaining({ id: 'asciidoc', formatClass: 'document' }),
            ]),
        );
    });

    test('exports current metric values, frozen revision values, and structured links.', async ({ request, api, categorySetup }) => {
        const metricResponse = await request.post(`/projects/${categorySetup.project.id}/metrics`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { value: '2000 ms', description: 'Maximum response time' },
        });
        expect(metricResponse.status()).toBe(201);
        const metric = (await metricResponse.json()) as { id: string; key: string };
        const source = await api.createRequirement(
            categorySetup.project.id,
            categorySetup.category.id,
            `Response below [~${metric.key}].`,
        );
        const target = await api.createRequirement(categorySetup.project.id, categorySetup.category.id, 'Target.');

        expect((await request.post(`/projects/${categorySetup.project.id}/requirements/${source.id}/links`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { targetKey: target.visibleKey },
        })).status()).toBe(201);
        expect((await request.patch(`/projects/${categorySetup.project.id}/metrics/${metric.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { value: '3000 ms', description: 'Maximum response time' },
        })).status()).toBe(200);
        expect((await request.patch(`/projects/${categorySetup.project.id}/requirements/${source.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { description: `Response below [~${metric.key}]. Updated.`, changeReason: 'Clarify wording.' },
        })).status()).toBe(200);

        const response = await request.get(`/export/projects/${categorySetup.project.id}?format=json`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });
        expect(response.status()).toBe(200);
        expect(response.headers()['content-disposition']).toContain('attachment;');
        const body = (await response.json()) as ExportBody;
        const exported = body.projects[0]?.requirements.find(({ id }) => id === source.id);
        expect(body.schemaVersion).toBe('1.0');
        expect(body.scope).toBe('project');
        expect(body.projects[0]?.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ key: metric.key, value: '3000 ms' })]));
        expect(exported?.description).toContain(`[~${metric.key}]`);
        expect(exported?.renderedDescription).toContain('3000 ms');
        expect(exported?.revisions.find(({ revisionNumber }) => revisionNumber === 1)?.renderedDescription).toContain('2000 ms');
        expect(body.projects[0]?.requirementLinks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ sourceRequirementKey: source.visibleKey, targetRequirementKey: target.visibleKey }),
            ]),
        );

        const markdown = await request.get(`/export/projects/${categorySetup.project.id}?format=markdown`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });
        expect(markdown.status()).toBe(200);
        expect(await markdown.text()).toContain(source.visibleKey);
        const asciidoc = await request.get(`/export/projects/${categorySetup.project.id}?format=asciidoc`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });
        expect(asciidoc.status()).toBe(200);
        expect(await asciidoc.text()).toContain('3000 ms');
    });

    test('enforces export authorization and validates requirement selection.', async ({ request, draftRequirement }) => {
        const projectPath = `/export/projects/${draftRequirement.project.id}?format=json`;
        expect((await request.get(projectPath, { headers: E2E_DEVELOPER_HEADERS })).status()).toBe(403);
        expect((await request.get(projectPath, { headers: E2E_ADMIN_HEADERS })).status()).toBe(403);
        expect((await request.get('/export/projects?format=json')).status()).toBe(403);
        expect((await request.get('/export/projects?format=json', {
            headers: { 'X-Operational-Export-Secret': 'test-only-operational-export-secret' },
        })).status()).toBe(200);

        const selected = await request.get(
            `/export/requirements?id=${draftRequirement.requirement.id},${draftRequirement.requirement.id}&format=json`,
            { headers: E2E_REQUIREMENTS_ENGINEER_HEADERS },
        );
        expect(selected.status()).toBe(200);
        const selectedBody = (await selected.json()) as ExportBody;
        expect(selectedBody.scope).toBe('requirements');
        expect(selectedBody.projects[0]?.requirements).toHaveLength(1);

        expect((await request.get('/export/requirements?id=not-a-uuid&format=json', {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        })).status()).toBe(400);
        expect((await request.get(`/export/requirements?id=${randomUUID()}&format=json`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        })).status()).toBe(404);
        expect((await request.get(`/export/requirements?id=${draftRequirement.requirement.id}&format=yaml`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        })).status()).toBe(400);
    });
});
