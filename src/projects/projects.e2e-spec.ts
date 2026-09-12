import { randomUUID } from 'node:crypto';

import { demoProjects } from '@/database/seeding/demo-projects';
import { expect, test } from '@/projects/projects-api.e2e-fixtures';

import {
    expectIsoDateString,
    expectProjectResponseBody,
    UUID_REGEX,
    E2E_ADMIN_HEADERS,
    E2E_REQUIREMENTS_ENGINEER_HEADERS,
    type ErrorResponseBody,
    type ProjectResponseBody,
} from '@/projects/projects-api.e2e-helpers';

test.describe('Projects API - GET /projects', () => {
    test('lists seeded demo projects for the Requirements Engineer.', async ({ request }) => {
        const response = await request.get('/projects', { headers: E2E_REQUIREMENTS_ENGINEER_HEADERS });

        expect(response.status()).toBe(200);

        const body = (await response.json()) as readonly ProjectResponseBody[];
        const projectNames = body.map((project) => project.name);
        const expectedNames = demoProjects.map((project) => project.name).sort((left, right) => left.localeCompare(right));

        expect(projectNames).toEqual(expectedNames);
    });

    test('lists all projects.', async ({ request }) => {
        const firstProjectName = `Playwright API list project A ${randomUUID()}`;
        const secondProjectName = `Playwright API list project B ${randomUUID()}`;

        const firstCreateResponse = await request.post('/projects', { data: { name: firstProjectName }, headers: E2E_ADMIN_HEADERS });
        const secondCreateResponse = await request.post('/projects', { data: { name: secondProjectName }, headers: E2E_ADMIN_HEADERS });

        expect(firstCreateResponse.status()).toBe(201);
        expect(secondCreateResponse.status()).toBe(201);

        const response = await request.get('/projects', { headers: E2E_ADMIN_HEADERS });

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
});

test.describe('Projects API - GET /projects/{id}', () => {
    test('gets a project.', async ({ request, api }) => {
        const projectName = `Playwright API get project ${randomUUID()}`;
        const createdProject = await api.createProject(projectName);

        const response = await request.get(`/projects/${createdProject.id}`, { headers: E2E_ADMIN_HEADERS });

        expect(response.status()).toBe(200);

        const body = (await response.json()) as ProjectResponseBody;

        expect(body.id).toBe(createdProject.id);
        expect(body.createdAt).toBe(createdProject.createdAt);
        expectProjectResponseBody(body, projectName);
    });

    test('returns 404 when the project does not exist.', async ({ request }) => {
        const unknownProjectId = randomUUID();

        const response = await request.get(`/projects/${unknownProjectId}`, { headers: E2E_ADMIN_HEADERS });

        expect(response.status()).toBe(404);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(404);
        expect(body.message).toBe(`Project with id "${unknownProjectId}" was not found.`);
        expect(body.error).toBe('Not Found');
    });
});

test.describe('Projects API - POST /projects', () => {
    test('creates a project.', async ({ request }) => {
        const projectName = `Playwright API project ${randomUUID()}`;

        const response = await request.post('/projects', { data: { name: `  ${projectName}  ` }, headers: E2E_ADMIN_HEADERS });

        expect(response.status()).toBe(201);

        const body = (await response.json()) as ProjectResponseBody;

        expectProjectResponseBody(body, projectName);
    });

    test('rejects an empty project name.', async ({ request }) => {
        const response = await request.post('/projects', { data: { name: '   ' }, headers: E2E_ADMIN_HEADERS });

        expect(response.status()).toBe(400);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(400);
        expect(body.message).toBe('Project name must not be empty.');
        expect(body.error).toBe('Bad Request');
    });
});

test.describe('Projects API - PATCH /projects/{id}', () => {
    test('updates a project and trims the name.', async ({ request, api }) => {
        const originalProjectName = `Playwright API update project ${randomUUID()}`;
        const updatedProjectName = `Playwright API updated project ${randomUUID()}`;

        const createdProject = await api.createProject(originalProjectName);

        const response = await request.patch(`/projects/${createdProject.id}`, {
            data: { name: `  ${updatedProjectName}  ` },
            headers: E2E_ADMIN_HEADERS,
        });

        expect(response.status()).toBe(200);

        const body = (await response.json()) as ProjectResponseBody;

        expect(body.id).toBe(createdProject.id);
        expect(body.createdAt).toBe(createdProject.createdAt);
        expectProjectResponseBody(body, updatedProjectName);
    });

    test('rejects an empty project name while updating.', async ({ request }) => {
        const response = await request.patch(`/projects/${randomUUID()}`, { data: { name: '   ' }, headers: E2E_ADMIN_HEADERS });

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
            headers: E2E_ADMIN_HEADERS,
        });

        expect(response.status()).toBe(404);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(404);
        expect(body.message).toBe(`Project with id "${unknownProjectId}" was not found.`);
        expect(body.error).toBe('Not Found');
    });
});

test.describe('Projects API - DELETE /projects/{id}', () => {
    test('deletes a project.', async ({ request, api }) => {
        const projectName = `Playwright API delete project ${randomUUID()}`;

        const createdProject = await api.createProject(projectName);

        const deleteResponse = await request.delete(`/projects/${createdProject.id}`, { headers: E2E_ADMIN_HEADERS });

        expect(deleteResponse.status()).toBe(204);
        expect(await deleteResponse.text()).toBe('');

        const listResponse = await request.get('/projects', { headers: E2E_ADMIN_HEADERS });

        expect(listResponse.status()).toBe(200);

        const projects = (await listResponse.json()) as readonly ProjectResponseBody[];

        expect(projects.some((project) => project.id === createdProject.id)).toBe(false);
    });

    test('returns 404 when deleting an unknown project.', async ({ request }) => {
        const unknownProjectId = randomUUID();

        const response = await request.delete(`/projects/${unknownProjectId}`, { headers: E2E_ADMIN_HEADERS });

        expect(response.status()).toBe(404);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(404);
        expect(body.message).toBe(`Project with id "${unknownProjectId}" was not found.`);
        expect(body.error).toBe('Not Found');
    });
});
