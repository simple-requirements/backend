import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

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
    type: RequirementType;
    categoryId: string;
    sequenceNumber: number;
    status: RequirementStatus;
    description: string;
    priority: string;
    owner: string | null;
    rationale: string | null;
    source: string | null;
    createdAt: string;
    updatedAt: string;
}

const uniqueKey = (prefix: string): string => `${prefix}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;

async function createCategory(request: APIRequestContext, name: string, key: string): Promise<CategoryApiResponse> {
    const response = await request.post('/categories', { data: { name, key } });

    expect(response.status()).toBe(201);

    return (await response.json()) as CategoryApiResponse;
}

async function createRequirement(
    request: APIRequestContext,
    categoryId: string,
    overrides: Partial<{
        type: RequirementType;
        description: string;
        priority: string;
        owner: string | null;
        rationale: string | null;
        source: string | null;
    }> = {},
): Promise<RequirementApiResponse> {
    const response = await request.post('/requirements', {
        data: {
            type: RequirementType.NFR,
            categoryId,
            description: 'The API should respond quickly for interactive users.',
            priority: 'high',
            owner: null,
            rationale: 'Latency impacts user trust.',
            source: 'US-REQ-001',
            ...overrides,
        },
    });

    expect(response.status()).toBe(201);

    return (await response.json()) as RequirementApiResponse;
}

test.describe('requirements API', () => {
    let categoryKey: string;
    let category: CategoryApiResponse;
    let created: RequirementApiResponse;

    test.beforeEach(async () => {
        await cleanDatabase();
        categoryKey = uniqueKey('PERF');
    });

    test.afterAll(async () => {
        await closeE2eDataSource();
    });

    test('Creates a draft requirement.', async ({ request }) => {
        category = await createCategory(request, 'Performance', categoryKey);
        created = await createRequirement(request, category.id);
        expect(created).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                visibleKey: `${RequirementType.NFR}-${categoryKey}-0001`,
                type: RequirementType.NFR,
                categoryId: category.id,
                sequenceNumber: 1,
                status: RequirementStatus.Draft,
                description: 'The API should respond quickly for interactive users.',
                priority: 'high',
                owner: null,
                rationale: 'Latency impacts user trust.',
                source: 'US-REQ-001',
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
            }),
        );
    });

    test('Retrieves a draft requirement by internal ID.', async ({ request }) => {
        const response = await request.get(`/requirements/${created.id}`);
        expect(response.status()).toBe(200);

        const retrieved = (await response.json()) as RequirementApiResponse;
        expect(retrieved).toEqual(
            expect.objectContaining({
                id: created.id,
                visibleKey: created.visibleKey,
                type: created.type,
                categoryId: created.categoryId,
                sequenceNumber: created.sequenceNumber,
                status: RequirementStatus.Draft,
            }),
        );
    });

    test('Retrieves a draft requirement by its visible key.', async ({ request }) => {
        const response = await request.get(`/requirements/key/${created.visibleKey}`);
        expect(response.status()).toBe(200);

        const retrieved = (await response.json()) as RequirementApiResponse;
        expect(retrieved).toEqual(
            expect.objectContaining({
                id: created.id,
                visibleKey: created.visibleKey,
                type: created.type,
                categoryId: created.categoryId,
                sequenceNumber: created.sequenceNumber,
                status: RequirementStatus.Draft,
            }),
        );
    });

    test('Lists requirements.', async ({ request }) => {
        categoryKey = uniqueKey('SEC');
        const categoryResponse = await request.post('/categories', { data: { name: 'Security', key: categoryKey } });
        expect(categoryResponse.status()).toBe(201);

        const category = (await categoryResponse.json()) as CategoryApiResponse;
        const createResponse = await request.post('/requirements', {
            data: {
                type: RequirementType.FR,
                categoryId: category.id,
                description: 'The system records login events.',
                priority: 'medium',
            },
        });
        expect(createResponse.status()).toBe(201);

        created = (await createResponse.json()) as RequirementApiResponse;
        const listResponse = await request.get('/requirements');
        expect(listResponse.status()).toBe(200);
        const requirements = (await listResponse.json()) as RequirementApiResponse[];
        expect(requirements).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: created.id, visibleKey: created.visibleKey })]),
        );
    });

    test('Rejects invalid requirement creation requests.', async ({ request }) => {
        const response = await request.post('/requirements', {
            data: { type: 'BUG', categoryId: 'missing', description: 'Description', priority: 'high' },
        });

        expect(response.status()).toBe(400);
    });

    test('Returns not found for unknown requirements.', async ({ request }) => {
        const response = await request.get('/requirements/key/NFR-PERF-9999');

        expect(response.status()).toBe(404);
    });
});
