import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { cleanDatabase, closeE2eDataSource } from '@/database/database-test-utility';

interface ProjectApiResponse {
    id: string;
    name: string;
    requirementCount: number;
    createdAt: string;
    updatedAt: string;
}

interface MetricApiResponse {
    id: string;
    projectId: string;
    key: string;
    value: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

async function createProject(request: APIRequestContext, name = 'Metric Project'): Promise<ProjectApiResponse> {
    const response = await request.post('/projects', { data: { name } });
    expect(response.status()).toBe(201);
    return (await response.json()) as ProjectApiResponse;
}

async function createMetric(
    request: APIRequestContext,
    projectId: string,
    key = 'MET-0001',
    value = '2000 ms',
    description: string | null = 'Max. latency',
): Promise<MetricApiResponse> {
    const response = await request.post('/metrics', { data: { projectId, key, value, description } });
    expect(response.status()).toBe(201);
    return (await response.json()) as MetricApiResponse;
}

test.describe('metrics API', () => {
    test.beforeEach(async () => {
        await cleanDatabase();
    });

    test.afterAll(async () => {
        await closeE2eDataSource();
    });

    test('creates, lists, and retrieves project-scoped metrics.', async ({ request }) => {
        const project = await createProject(request);
        const metric = await createMetric(request, project.id);

        expect(metric).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                projectId: project.id,
                key: 'MET-0001',
                value: '2000 ms',
                description: 'Max. latency',
            }),
        );

        const listResponse = await request.get(`/metrics?projectId=${project.id}`);
        expect(listResponse.status()).toBe(200);
        expect((await listResponse.json()) as MetricApiResponse[]).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: metric.id, key: 'MET-0001' })]),
        );

        const byIdResponse = await request.get(`/metrics/${metric.id}`);
        expect(byIdResponse.status()).toBe(200);
        expect((await byIdResponse.json()) as MetricApiResponse).toEqual(expect.objectContaining({ id: metric.id }));

        const byKeyResponse = await request.get(`/metrics/key/MET-0001?projectId=${project.id}`);
        expect(byKeyResponse.status()).toBe(200);
        expect((await byKeyResponse.json()) as MetricApiResponse).toEqual(expect.objectContaining({ id: metric.id }));
    });

    test('validates keys, blank values, and duplicate keys within a project.', async ({ request }) => {
        const project = await createProject(request);

        const invalidKeyResponse = await request.post('/metrics', {
            data: { projectId: project.id, key: 'met-0001', value: '2000 ms' },
        });
        expect(invalidKeyResponse.status()).toBe(400);

        const blankValueResponse = await request.post('/metrics', {
            data: { projectId: project.id, key: 'MET-0001', value: '   ' },
        });
        expect(blankValueResponse.status()).toBe(400);

        await createMetric(request, project.id, 'MET-0001');
        const duplicateResponse = await request.post('/metrics', {
            data: { projectId: project.id, key: 'MET-0001', value: '1500 ms' },
        });
        expect(duplicateResponse.status()).toBe(409);
    });

    test('allows the same key in different projects.', async ({ request }) => {
        const firstProject = await createProject(request, 'First Project');
        const secondProject = await createProject(request, 'Second Project');

        const firstMetric = await createMetric(request, firstProject.id, 'MET-0001');
        const secondMetric = await createMetric(request, secondProject.id, 'MET-0001', '1500 ms', 'Other latency');

        expect(firstMetric.projectId).toBe(firstProject.id);
        expect(secondMetric.projectId).toBe(secondProject.id);
        expect(firstMetric.id).not.toBe(secondMetric.id);
    });
});
