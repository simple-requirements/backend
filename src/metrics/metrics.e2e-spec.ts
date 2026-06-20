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

    test('creates project-scoped metrics.', async ({ request }) => {
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
    });

    test('lists metrics by project.', async ({ request }) => {
        const project = await createProject(request);
        const metric = await createMetric(request, project.id);

        const response = await request.get(`/metrics?projectId=${project.id}`);
        expect(response.status()).toBe(200);
        expect((await response.json()) as MetricApiResponse[]).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: metric.id, key: 'MET-0001' })]),
        );
    });

    test('retrieves metrics by id.', async ({ request }) => {
        const project = await createProject(request);
        const metric = await createMetric(request, project.id);

        const response = await request.get(`/metrics/${metric.id}`);
        expect(response.status()).toBe(200);
        expect((await response.json()) as MetricApiResponse).toEqual(expect.objectContaining({ id: metric.id }));
    });

    test('retrieves metrics by key within a project.', async ({ request }) => {
        const project = await createProject(request);
        const metric = await createMetric(request, project.id);

        const response = await request.get(`/metrics/key/MET-0001?projectId=${project.id}`);
        expect(response.status()).toBe(200);
        expect((await response.json()) as MetricApiResponse).toEqual(expect.objectContaining({ id: metric.id }));
    });

    for (const invalidCase of [
        { name: 'invalid key', data: { key: 'met-0001', value: '2000 ms' } },
        { name: 'blank value', data: { key: 'MET-0001', value: '   ' } },
    ]) {
        test(`rejects ${invalidCase.name}.`, async ({ request }) => {
            const project = await createProject(request);

            const response = await request.post('/metrics', { data: { projectId: project.id, ...invalidCase.data } });

            expect(response.status()).toBe(400);
        });
    }

    test('rejects duplicate metric keys within a project.', async ({ request }) => {
        const project = await createProject(request);
        await createMetric(request, project.id, 'MET-0001');

        const response = await request.post('/metrics', {
            data: { projectId: project.id, key: 'MET-0001', value: '1500 ms' },
        });

        expect(response.status()).toBe(409);
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
