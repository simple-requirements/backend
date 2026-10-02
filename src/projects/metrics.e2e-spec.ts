import { randomUUID } from 'node:crypto';

import type { APIRequestContext } from '@playwright/test';

import { expect, test } from '@/projects/projects-api.e2e-fixtures';
import {
    E2E_ADMIN_HEADERS,
    E2E_DEVELOPER_HEADERS,
    E2E_REQUIREMENTS_ENGINEER_HEADERS,
    E2E_VIEWER_HEADERS,
    expectErrorResponseBody,
    type ErrorResponseBody,
} from '@/projects/projects-api.e2e-helpers';

type MetricBody = Readonly<{
    id: string;
    projectId: string;
    key: string;
    value: string;
    description: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}>;

async function createMetric(request: APIRequestContext, projectId: string, value = '2000 ms') {
    return request.post(`/projects/${projectId}/metrics`, {
        headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        data: { value, description: 'Response-time target' },
    });
}

test.describe('Metrics API', () => {
    test('generates project-scoped immutable keys and lists/gets metrics.', async ({ request, api }) => {
        const firstProject = await api.createProject(`Metrics project A ${randomUUID()}`);
        const secondProject = await api.createProject(`Metrics project B ${randomUUID()}`);

        const firstResponse = await createMetric(request, firstProject.id);
        const secondResponse = await createMetric(request, firstProject.id, '1000 ms');
        const otherProjectResponse = await createMetric(request, secondProject.id, '500 ms');
        expect([firstResponse.status(), secondResponse.status(), otherProjectResponse.status()]).toEqual([201, 201, 201]);

        const first = (await firstResponse.json()) as MetricBody;
        const second = (await secondResponse.json()) as MetricBody;
        const other = (await otherProjectResponse.json()) as MetricBody;
        expect(first.key).toBe('MET-0001');
        expect(second.key).toBe('MET-0002');
        expect(other.key).toBe('MET-0001');

        const listResponse = await request.get(`/projects/${firstProject.id}/metrics`, {
            headers: E2E_VIEWER_HEADERS,
        });
        expect(listResponse.status()).toBe(200);
        expect(((await listResponse.json()) as MetricBody[]).map((metric) => metric.key)).toEqual(['MET-0001', 'MET-0002']);

        const getResponse = await request.get(`/projects/${firstProject.id}/metrics/${first.id}`, {
            headers: E2E_DEVELOPER_HEADERS,
        });
        expect(getResponse.status()).toBe(200);
        expect(((await getResponse.json()) as MetricBody).id).toBe(first.id);
    });

    test('updates value/description without accepting a client key and deactivates without deleting.', async ({ request, api }) => {
        const project = await api.createProject(`Metrics mutation project ${randomUUID()}`);
        const createdResponse = await createMetric(request, project.id);
        const created = (await createdResponse.json()) as MetricBody;

        const updateResponse = await request.patch(`/projects/${project.id}/metrics/${created.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { key: 'MET-9999', value: '750 ms', description: 'Updated target' },
        });
        expect(updateResponse.status()).toBe(200);
        const updated = (await updateResponse.json()) as MetricBody;
        expect(updated.key).toBe('MET-0001');
        expect(updated.value).toBe('750 ms');
        expect(updated.description).toBe('Updated target');

        const deactivateResponse = await request.post(`/projects/${project.id}/metrics/${created.id}/deactivate`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });
        expect(deactivateResponse.status()).toBe(200);
        expect(((await deactivateResponse.json()) as MetricBody).active).toBe(false);

        const getResponse = await request.get(`/projects/${project.id}/metrics/${created.id}`, {
            headers: E2E_VIEWER_HEADERS,
        });
        expect(getResponse.status()).toBe(200);
        expect(((await getResponse.json()) as MetricBody).active).toBe(false);
    });

    test('rejects empty values.', async ({ request, api }) => {
        const project = await api.createProject(`Metrics validation project ${randomUUID()}`);
        const response = await request.post(`/projects/${project.id}/metrics`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { value: '   ' },
        });
        expect(response.status()).toBe(400);
        expectErrorResponseBody((await response.json()) as ErrorResponseBody, 400, 'Metric value must not be empty.', 'Bad Request');
    });

    test('allows Developer/Viewer read access but denies mutation.', async ({ request, api }) => {
        const project = await api.createProject(`Metrics permissions project ${randomUUID()}`);
        const createdResponse = await createMetric(request, project.id);
        const created = (await createdResponse.json()) as MetricBody;

        for (const headers of [E2E_DEVELOPER_HEADERS, E2E_VIEWER_HEADERS]) {
            expect((await request.get(`/projects/${project.id}/metrics`, { headers })).status()).toBe(200);
            expect((await request.get(`/projects/${project.id}/metrics/${created.id}`, { headers })).status()).toBe(200);
            expect((await request.post(`/projects/${project.id}/metrics`, { headers, data: { value: '1 s' } })).status()).toBe(403);
            expect((await request.patch(`/projects/${project.id}/metrics/${created.id}`, { headers, data: { value: '1 s' } })).status()).toBe(403);
            expect((await request.post(`/projects/${project.id}/metrics/${created.id}/deactivate`, { headers })).status()).toBe(403);
        }
    });

    test('denies Administrator access to metric content.', async ({ request, api }) => {
        const project = await api.createProject(`Metrics admin isolation project ${randomUUID()}`);
        const createdResponse = await createMetric(request, project.id);
        const created = (await createdResponse.json()) as MetricBody;

        for (const response of [
            await request.get(`/projects/${project.id}/metrics`, { headers: E2E_ADMIN_HEADERS }),
            await request.get(`/projects/${project.id}/metrics/${created.id}`, { headers: E2E_ADMIN_HEADERS }),
            await request.post(`/projects/${project.id}/metrics`, { headers: E2E_ADMIN_HEADERS, data: { value: '1 s' } }),
        ]) {
            expect(response.status()).toBe(403);
        }
    });
});
