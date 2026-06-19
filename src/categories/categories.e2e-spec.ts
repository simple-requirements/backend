import { expect, test } from '@playwright/test';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { cleanDatabase, closeE2eDataSource } from '@/database/database-test-utility';

interface CategoryApiResponse {
    id: string;
    name: string;
    key: string;
    type: RequirementType;
    createdAt: string;
    updatedAt: string;
}

const categoryKeys = ['UI', 'AUTH', 'DATA', 'PERF', 'SEC'];
let keyIndex = 0;
const uniqueKey = (): string => categoryKeys[keyIndex++ % categoryKeys.length];

test.describe('categories API', () => {
    let key: string;
    const categoryName = 'Performance';

    test.beforeEach(async () => {
        await cleanDatabase();
        key = uniqueKey();
    });

    test.afterAll(async () => {
        await closeE2eDataSource();
    });

    test('Creates categories with valid uppercase keys.', async ({ request }) => {
        const createResponse = await request.post('/categories', {
            data: { name: categoryName, key, type: RequirementType.NFR },
        });
        expect(createResponse.status()).toBe(201);
        const created = (await createResponse.json()) as CategoryApiResponse;

        expect(created).toEqual(
            expect.objectContaining({ id: expect.any(String), name: categoryName, key, type: RequirementType.NFR }),
        );
    });

    test('Lists categories with valid uppercase keys.', async ({ request }) => {
        const createResponse = await request.post('/categories', {
            data: { name: categoryName, key, type: RequirementType.NFR },
        });
        expect(createResponse.status()).toBe(201);
        const created = (await createResponse.json()) as CategoryApiResponse;

        const listResponse = await request.get('/categories');
        expect(listResponse.status()).toBe(200);

        const categories = (await listResponse.json()) as CategoryApiResponse;

        expect(categories).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: created.id, name: 'Performance', key, type: RequirementType.NFR }),
            ]),
        );
    });

    test('Retrieves categories with valid uppercase keys.', async ({ request }) => {
        const createResponse = await request.post('/categories', {
            data: { name: categoryName, key, type: RequirementType.NFR },
        });
        expect(createResponse.status()).toBe(201);
        const created = (await createResponse.json()) as CategoryApiResponse;

        const retrieveResponse = await request.get(`/categories/${created.id}`);
        expect(retrieveResponse.status()).toBe(200);
        await expect(retrieveResponse.json()).resolves.toEqual(expect.objectContaining({ id: created.id, key }));
    });

    test.describe('Category keys', () => {
        test('Rejects lowercase category keys.', async ({ request }) => {
            const response = await request.post('/categories', {
                data: { name: categoryName, key: 'lower-case-key', type: RequirementType.NFR },
            });

            expect(response.status()).toBe(400);
        });

        test('Rejects invalid category key characters.', async ({ request }) => {
            const response = await request.post('/categories', {
                data: { name: categoryName, key: '/nval/d-ke&', type: RequirementType.NFR },
            });

            expect(response.status()).toBe(400);
        });

        test('rejects duplicate category keys.', async ({ request }) => {
            const key = 'DUP';

            const firstResponse = await request.post('/categories', {
                data: { name: categoryName, key, type: RequirementType.NFR },
            });
            expect(firstResponse.status()).toBe(201);

            const duplicateResponse = await request.post('/categories', {
                data: { name: 'Compatibility', key, type: RequirementType.NFR },
            });
            expect(duplicateResponse.status()).toBe(409);
        });
    });
});
