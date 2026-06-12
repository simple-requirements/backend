import { expect, test } from '@playwright/test';
import { cleanDatabase, closeE2eDataSource } from '@/database/database-test-utility';

interface CategoryApiResponse {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    updatedAt: string;
}

const uniqueKey = (prefix: string): string =>
    `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

test.describe('categories API', () => {
    let key: string;
    const categoryName = 'Performance';

    test.beforeEach(async () => {
        await cleanDatabase();
        key = uniqueKey('PERF');
    });

    test.afterAll(async () => {
        await closeE2eDataSource();
    });

    test('Creates categories with valid uppercase keys.', async ({ request }) => {
        const createResponse = await request.post('/categories', { data: { name: categoryName, key } });
        expect(createResponse.status()).toBe(201);
        const created = (await createResponse.json()) as CategoryApiResponse;

        expect(created).toEqual(expect.objectContaining({ id: expect.any(String), name: categoryName, key }));
    });

    test('Lists categories with valid uppercase keys.', async ({ request }) => {
        const createResponse = await request.post('/categories', { data: { name: categoryName, key } });
        expect(createResponse.status()).toBe(201);
        const created = (await createResponse.json()) as CategoryApiResponse;

        const listResponse = await request.get('/categories');
        expect(listResponse.status()).toBe(200);

        const categories = (await listResponse.json()) as CategoryApiResponse;

        expect(categories).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: created.id, name: 'Performance', key })]),
        );
    });

    test('Retrieves categories with valid uppercase keys.', async ({ request }) => {
        const createResponse = await request.post('/categories', { data: { name: categoryName, key } });
        expect(createResponse.status()).toBe(201);
        const created = (await createResponse.json()) as CategoryApiResponse;

        const retrieveResponse = await request.get(`/categories/${created.id}`);
        expect(retrieveResponse.status()).toBe(200);
        await expect(retrieveResponse.json()).resolves.toEqual(expect.objectContaining({ id: created.id, key }));
    });

    test.describe('Category keys', () => {
        test('Rejects lowercase category keys.', async ({ request }) => {
            const response = await request.post('/categories', { data: { name: categoryName, key: 'lower-case-key' } });

            expect(response.status()).toBe(400);
        });

        test('Rejects invalid category key characters.', async ({ request }) => {
            const response = await request.post('/categories', { data: { name: categoryName, key: '/nval/d-ke&' } });

            expect(response.status()).toBe(400);
        });

        test('rejects duplicate category keys.', async ({ request }) => {
            const key = 'DUPKEY';

            const firstResponse = await request.post('/categories', { data: { name: categoryName, key } });
            expect(firstResponse.status()).toBe(201);

            const duplicateResponse = await request.post('/categories', { data: { name: 'Compatibility', key } });
            expect(duplicateResponse.status()).toBe(409);
        });
    });
});
