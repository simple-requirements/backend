import { expect, test } from '@playwright/test';

interface CategoryApiResponse {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  updatedAt: string;
}

function uniqueKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

test.describe('categories API', () => {
  test('creates, lists, and retrieves categories with valid uppercase keys', async ({
    request,
  }) => {
    const key = uniqueKey('FR');

    const createResponse = await request.post('/categories', {
      data: { name: 'Functional Requirements', key },
    });

    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as CategoryApiResponse;
    expect(created).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'Functional Requirements',
        key,
      }),
    );

    const listResponse = await request.get('/categories');
    expect(listResponse.status()).toBe(200);
    await expect(listResponse.json()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.id, key }),
      ]),
    );

    const retrieveResponse = await request.get(`/categories/${created.id}`);
    expect(retrieveResponse.status()).toBe(200);
    await expect(retrieveResponse.json()).resolves.toEqual(
      expect.objectContaining({ id: created.id, key }),
    );
  });

  test('rejects lowercase category keys', async ({ request }) => {
    const response = await request.post('/categories', {
      data: { name: 'Functional Requirements', key: 'fr' },
    });

    expect(response.status()).toBe(400);
  });

  test('rejects invalid category key characters', async ({ request }) => {
    const response = await request.post('/categories', {
      data: { name: 'Functional Requirements', key: 'FR-1' },
    });

    expect(response.status()).toBe(400);
  });

  test('rejects duplicate category keys', async ({ request }) => {
    const key = uniqueKey('NFR');

    const firstResponse = await request.post('/categories', {
      data: { name: 'Non Functional Requirements', key },
    });
    expect(firstResponse.status()).toBe(201);

    const duplicateResponse = await request.post('/categories', {
      data: { name: 'Duplicate Non Functional Requirements', key },
    });
    expect(duplicateResponse.status()).toBe(409);
  });
});
