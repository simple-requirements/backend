import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import { isValid, parseISO } from 'date-fns';

type ProjectResponseBody = { id: string; name: string; createdAt: string; updatedAt: string };

type BadRequestResponseBody = { statusCode: number; message: string | string[]; error: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function expectIsoDateString(value: string): void {
    const parsedDate = parseISO(value);

    expect(isValid(parsedDate)).toBe(true);
    expect(parsedDate.toISOString()).toBe(value);
}

test.describe('Projects API', () => {
    test('creates a project', async ({ request }) => {
        const projectName = `Playwright API project ${randomUUID()}`;

        const response = await request.post('/projects', { data: { name: `  ${projectName}  ` } });

        expect(response.status()).toBe(201);

        const body = (await response.json()) as ProjectResponseBody;

        expect(body.id).toMatch(UUID_REGEX);
        expect(body.name).toBe(projectName);
        expectIsoDateString(body.createdAt);
        expectIsoDateString(body.updatedAt);
    });

    test('rejects an empty project name', async ({ request }) => {
        const response = await request.post('/projects', { data: { name: '   ' } });

        expect(response.status()).toBe(400);

        const body = (await response.json()) as BadRequestResponseBody;

        expect(body.statusCode).toBe(400);
        expect(body.message).toBe('Project name must not be empty.');
        expect(body.error).toBe('Bad Request');
    });
});
