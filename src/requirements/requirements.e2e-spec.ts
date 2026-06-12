import { expect, test } from '@playwright/test';

import { cleanDatabase, closeE2eDataSource } from '@/database/database-test-utility';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';

interface CategoryApiResponse {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    updatedAt: string;
}

interface RequirementApiResponse {
    id: string;
    visibleKey: string;
    kind: RequirementType;
    categoryId: string;
    sequenceNumber: number;
    status: RequirementStatus;
    title: string;
    description: string;
    priority: string;
    owner: string | null;
    rationale: string | null;
    source: string | null;
    createdAt: string;
    updatedAt: string;
}

const uniqueKey = (prefix: string): string => `${prefix}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;

test.describe('requirements API', () => {
    test.beforeEach(async () => {
        await cleanDatabase();
    });

    test.afterAll(async () => {
        await closeE2eDataSource();
    });

    test('Creates a draft requirement and retrieves it by internal ID and visible key.', async ({ request }) => {
        const categoryKey = uniqueKey('PER');
        const categoryResponse = await request.post('/categories', { data: { name: 'Performance', key: categoryKey } });
        expect(categoryResponse.status()).toBe(201);
        const category = (await categoryResponse.json()) as CategoryApiResponse;

        const createResponse = await request.post('/requirements', {
            data: {
                kind: RequirementType.NFR,
                categoryId: category.id,
                title: 'Fast response time',
                description: 'The API should respond quickly for interactive users.',
                priority: 'high',
                owner: null,
                rationale: 'Latency impacts user trust.',
                source: 'US-REQ-001',
            },
        });
        expect(createResponse.status()).toBe(201);
        const created = (await createResponse.json()) as RequirementApiResponse;

        expect(created).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                visibleKey: `${RequirementType.NFR}-${categoryKey}-0001`,
                kind: RequirementType.NFR,
                categoryId: category.id,
                sequenceNumber: 1,
                status: RequirementStatus.Draft,
                title: 'Fast response time',
                description: 'The API should respond quickly for interactive users.',
                priority: 'high',
                owner: null,
                rationale: 'Latency impacts user trust.',
                source: 'US-REQ-001',
            }),
        );

        const retrieveByIdResponse = await request.get(`/requirements/${created.id}`);
        expect(retrieveByIdResponse.status()).toBe(200);
        await expect(retrieveByIdResponse.json()).resolves.toEqual(expect.objectContaining({ id: created.id }));

        const retrieveByKeyResponse = await request.get(`/requirements/key/${created.visibleKey}`);
        expect(retrieveByKeyResponse.status()).toBe(200);
        await expect(retrieveByKeyResponse.json()).resolves.toEqual(
            expect.objectContaining({ id: created.id, visibleKey: created.visibleKey }),
        );
    });

    test('Lists requirements.', async ({ request }) => {
        const categoryKey = uniqueKey('SEC');
        const categoryResponse = await request.post('/categories', { data: { name: 'Security', key: categoryKey } });
        expect(categoryResponse.status()).toBe(201);
        const category = (await categoryResponse.json()) as CategoryApiResponse;

        const createResponse = await request.post('/requirements', {
            data: {
                kind: RequirementType.FR,
                categoryId: category.id,
                title: 'Audit login',
                description: 'The system records login events.',
                priority: 'medium',
            },
        });
        expect(createResponse.status()).toBe(201);
        const created = (await createResponse.json()) as RequirementApiResponse;

        const listResponse = await request.get('/requirements');
        expect(listResponse.status()).toBe(200);
        const requirements = (await listResponse.json()) as RequirementApiResponse[];

        expect(requirements).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: created.id, visibleKey: created.visibleKey })]),
        );
    });

    test('Rejects invalid requirement creation requests.', async ({ request }) => {
        const response = await request.post('/requirements', {
            data: { kind: 'BUG', categoryId: 'missing', title: '', description: 'Description', priority: 'high' },
        });

        expect(response.status()).toBe(400);
    });

    test('Returns not found for unknown requirements.', async ({ request }) => {
        const response = await request.get('/requirements/key/NFR-PERF-9999');

        expect(response.status()).toBe(404);
    });
});
