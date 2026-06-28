import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import { isValid, parseISO } from 'date-fns';

interface ProjectResponseBody {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

interface BadRequestResponseBody {
    statusCode: number;
    message: string | string[];
    error: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function expectIsoDateString(value: string): void {
    const parsedDate = parseISO(value);

    expect(isValid(parsedDate)).toBe(true);
    expect(parsedDate.toISOString()).toBe(value);
}

function expectProjectResponseBody(body: ProjectResponseBody, expectedName: string): void {
    expect(body.id).toMatch(UUID_REGEX);
    expect(body.name).toBe(expectedName);
    expectIsoDateString(body.createdAt);
    expectIsoDateString(body.updatedAt);
}

test.describe('Projects API', () => {
    test('lists all projects.', async ({ request }) => {
        const firstProjectName = `Playwright API list project A ${randomUUID()}`;
        const secondProjectName = `Playwright API list project B ${randomUUID()}`;

        const firstCreateResponse = await request.post('/projects', { data: { name: firstProjectName } });
        const secondCreateResponse = await request.post('/projects', { data: { name: secondProjectName } });

        expect(firstCreateResponse.status()).toBe(201);
        expect(secondCreateResponse.status()).toBe(201);

        const response = await request.get('/projects');

        expect(response.status()).toBe(200);

        const body = (await response.json()) as readonly ProjectResponseBody[];

        expect(Array.isArray(body)).toBe(true);

        const projectNames = body.map((project) => project.name);
        const sortedProjectNames = [...projectNames].sort((left, right) => left.localeCompare(right));

        expect(projectNames).toEqual(sortedProjectNames);
        expect(projectNames).toContain(firstProjectName);
        expect(projectNames).toContain(secondProjectName);

        for (const project of body) {
            expect(project.id).toMatch(UUID_REGEX);
            expect(typeof project.name).toBe('string');
            expectIsoDateString(project.createdAt);
            expectIsoDateString(project.updatedAt);
        }
    });

    test('creates a project.', async ({ request }) => {
        const projectName = `Playwright API project ${randomUUID()}`;

        const response = await request.post('/projects', { data: { name: `  ${projectName}  ` } });

        expect(response.status()).toBe(201);

        const body = (await response.json()) as ProjectResponseBody;

        expectProjectResponseBody(body, projectName);
    });

    test('rejects an empty project name.', async ({ request }) => {
        const response = await request.post('/projects', { data: { name: '   ' } });

        expect(response.status()).toBe(400);

        const body = (await response.json()) as BadRequestResponseBody;

        expect(body.statusCode).toBe(400);
        expect(body.message).toBe('Project name must not be empty.');
        expect(body.error).toBe('Bad Request');
    });
});
