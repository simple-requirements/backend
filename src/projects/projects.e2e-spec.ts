import { randomUUID } from 'node:crypto';

import { expect, test, type APIRequestContext } from '@playwright/test';
import { isValid, parseISO } from 'date-fns';
import { resetE2eDatabase } from '@/database/seeding/reset-e2e-database';

interface ProjectResponseBody {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

interface ErrorResponseBody {
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

async function createProject(request: APIRequestContext, name: string): Promise<ProjectResponseBody> {
    const response = await request.post('/projects', { data: { name } });

    expect(response.status()).toBe(201);

    return (await response.json()) as ProjectResponseBody;
}

test.describe('Projects API', () => {
    test.beforeEach(async () => {
        await resetE2eDatabase();
    });

    test.afterAll(async () => {
        await resetE2eDatabase();
    });

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

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(400);
        expect(body.message).toBe('Project name must not be empty.');
        expect(body.error).toBe('Bad Request');
    });

    test('updates a project and trims the name.', async ({ request }) => {
        const originalProjectName = `Playwright API update project ${randomUUID()}`;
        const updatedProjectName = `Playwright API updated project ${randomUUID()}`;

        const createdProject = await createProject(request, originalProjectName);

        const response = await request.patch(`/projects/${createdProject.id}`, {
            data: { name: `  ${updatedProjectName}  ` },
        });

        expect(response.status()).toBe(200);

        const body = (await response.json()) as ProjectResponseBody;

        expect(body.id).toBe(createdProject.id);
        expect(body.createdAt).toBe(createdProject.createdAt);
        expectProjectResponseBody(body, updatedProjectName);
    });

    test('rejects an empty project name while updating.', async ({ request }) => {
        const response = await request.patch(`/projects/${randomUUID()}`, { data: { name: '   ' } });

        expect(response.status()).toBe(400);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(400);
        expect(body.message).toBe('Project name must not be empty.');
        expect(body.error).toBe('Bad Request');
    });

    test('returns 404 when updating an unknown project.', async ({ request }) => {
        const unknownProjectId = randomUUID();

        const response = await request.patch(`/projects/${unknownProjectId}`, {
            data: { name: `Playwright API unknown update ${randomUUID()}` },
        });

        expect(response.status()).toBe(404);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(404);
        expect(body.message).toBe(`Project with id "${unknownProjectId}" was not found.`);
        expect(body.error).toBe('Not Found');
    });

    test('deletes a project.', async ({ request }) => {
        const projectName = `Playwright API delete project ${randomUUID()}`;

        const createdProject = await createProject(request, projectName);

        const deleteResponse = await request.delete(`/projects/${createdProject.id}`);

        expect(deleteResponse.status()).toBe(204);
        expect(await deleteResponse.text()).toBe('');

        const listResponse = await request.get('/projects');

        expect(listResponse.status()).toBe(200);

        const projects = (await listResponse.json()) as readonly ProjectResponseBody[];

        expect(projects.some((project) => project.id === createdProject.id)).toBe(false);
    });

    test('returns 404 when deleting an unknown project.', async ({ request }) => {
        const unknownProjectId = randomUUID();

        const response = await request.delete(`/projects/${unknownProjectId}`);

        expect(response.status()).toBe(404);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(404);
        expect(body.message).toBe(`Project with id "${unknownProjectId}" was not found.`);
        expect(body.error).toBe('Not Found');
    });
});
