import { randomUUID } from 'node:crypto';

import { demoProjects } from '@/database/seeding/demo-projects';
import { expect, test } from '@/projects/projects-api.e2e-fixtures';

import {
    expectProjectResponseBody,
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
        const expectedNames = demoProjects
            .map((project) => project.name)
            .sort((left, right) => left.localeCompare(right));

        expect(projectNames).toEqual(expectedNames);
    });

    test('does not expose the project workspace list to an Administrator.', async ({ request }) => {
        const response = await request.get('/projects', { headers: E2E_ADMIN_HEADERS });

        expect(response.status()).toBe(403);
    });
});

test.describe('Projects API - GET /projects/{id}', () => {
    test('gets a project.', async ({ request, api }) => {
        const projectName = `Playwright API get project ${randomUUID()}`;
        const createdProject = await api.createProject(projectName);

        const response = await request.get(`/projects/${createdProject.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });

        expect(response.status()).toBe(200);

        const body = (await response.json()) as ProjectResponseBody;

        expect(body.id).toBe(createdProject.id);
        expect(body.createdAt).toBe(createdProject.createdAt);
        expectProjectResponseBody(body, projectName);
    });

    test('denies Administrator access to project details.', async ({ request, api }) => {
        const createdProject = await api.createProject(`Administrator-hidden project ${randomUUID()}`);

        const response = await request.get(`/projects/${createdProject.id}`, { headers: E2E_ADMIN_HEADERS });

        expect(response.status()).toBe(403);
    });
});

test.describe('Project administration API - GET /admin/projects', () => {
    test('returns summary-only metadata to an Administrator.', async ({ request, api }) => {
        const project = await api.createProject(`Administrator summary project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Security', 'SEC');
        await api.createRequirement(
            project.id,
            category.id,
            'This content must not be returned in the administrator summary.',
        );

        const listResponse = await request.get('/admin/projects', { headers: E2E_ADMIN_HEADERS });

        expect(listResponse.status()).toBe(200);
        const summaries = (await listResponse.json()) as Record<string, unknown>[];
        const body = summaries.find((summary) => summary.id === project.id);
        expect(body).toBeDefined();
        if (body === undefined) return;

        expect(body.id).toBe(project.id);
        expect(body.name).toBe(project.name);
        expect(body.categoryNames).toEqual(['Security']);
        expect(body.categoryCount).toBe(1);
        expect(body.requirementCount).toBe(1);
        expect(body.memberships).toHaveLength(3);
        expect(body).toHaveProperty('ticketUrlTemplate');
        expect(body).not.toHaveProperty('requirements');
        expect(body).not.toHaveProperty('categories');
        expect(JSON.stringify(body)).not.toContain('This content must not be returned in the administrator summary.');

        const detailResponse = await request.get(`/admin/projects/${project.id}`, { headers: E2E_ADMIN_HEADERS });
        expect(detailResponse.status()).toBe(200);
        expect(await detailResponse.json()).toEqual(body);
    });

    test('denies project-scoped accounts access to Administrator summaries.', async ({ request, project }) => {
        const response = await request.get(`/admin/projects/${project.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });

        expect(response.status()).toBe(403);
    });
});

test.describe('Projects API - administration boundary', () => {
    test('does not expose project creation through the project workspace API.', async ({ request }) => {
        const response = await request.post('/projects', {
            data: { name: `Wrong namespace ${randomUUID()}` },
            headers: E2E_ADMIN_HEADERS,
        });

        expect(response.status()).toBe(404);
    });
});

test.describe('Project administration API - POST /admin/projects', () => {
    test('creates a project.', async ({ request }) => {
        const projectName = `Playwright API project ${randomUUID()}`;

        const response = await request.post('/admin/projects', {
            data: { name: `  ${projectName}  ` },
            headers: E2E_ADMIN_HEADERS,
        });

        expect(response.status()).toBe(201);

        const body = (await response.json()) as ProjectResponseBody;

        expectProjectResponseBody(body, projectName);
    });

    test('rejects an empty project name.', async ({ request }) => {
        const response = await request.post('/admin/projects', { data: { name: '   ' }, headers: E2E_ADMIN_HEADERS });

        expect(response.status()).toBe(400);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(400);
        expect(body.message).toBe('Project name must not be empty.');
        expect(body.error).toBe('Bad Request');
    });
});

test.describe('Project administration API - PATCH /admin/projects/{id}', () => {
    test('updates a project and trims the name.', async ({ request, api }) => {
        const originalProjectName = `Playwright API update project ${randomUUID()}`;
        const updatedProjectName = `Playwright API updated project ${randomUUID()}`;

        const createdProject = await api.createProject(originalProjectName);

        const ticketUrlTemplate = 'https://tracker.example/projects/requirements/{ticket-id}';
        const response = await request.patch(`/admin/projects/${createdProject.id}`, {
            data: { name: `  ${updatedProjectName}  `, ticketUrlTemplate },
            headers: E2E_ADMIN_HEADERS,
        });

        expect(response.status()).toBe(200);

        const body = (await response.json()) as ProjectResponseBody;

        expect(body.id).toBe(createdProject.id);
        expect(body.createdAt).toBe(createdProject.createdAt);
        expect(body.ticketUrlTemplate).toBe(ticketUrlTemplate);
        expectProjectResponseBody(body, updatedProjectName);
    });

    test('rejects an empty project name while updating.', async ({ request }) => {
        const response = await request.patch(`/admin/projects/${randomUUID()}`, {
            data: { name: '   ' },
            headers: E2E_ADMIN_HEADERS,
        });

        expect(response.status()).toBe(400);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(400);
        expect(body.message).toBe('Project name must not be empty.');
        expect(body.error).toBe('Bad Request');
    });

    test('returns 404 when updating an unknown project.', async ({ request }) => {
        const unknownProjectId = randomUUID();

        const response = await request.patch(`/admin/projects/${unknownProjectId}`, {
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

test.describe('Project administration API - DELETE /admin/projects/{id}', () => {
    test('deletes a project.', async ({ request, api }) => {
        const projectName = `Playwright API delete project ${randomUUID()}`;

        const createdProject = await api.createProject(projectName);

        const deleteResponse = await request.delete(`/admin/projects/${createdProject.id}`, {
            headers: E2E_ADMIN_HEADERS,
        });

        expect(deleteResponse.status()).toBe(204);
        expect(await deleteResponse.text()).toBe('');

        const listResponse = await request.get('/projects', { headers: E2E_REQUIREMENTS_ENGINEER_HEADERS });

        expect(listResponse.status()).toBe(200);

        const projects = (await listResponse.json()) as readonly ProjectResponseBody[];

        expect(projects.some((project) => project.id === createdProject.id)).toBe(false);
    });

    test('rejects deletion of a project that contains requirements.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API retained project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Retention', 'RET');
        const requirement = await api.createRequirement(
            project.id,
            category.id,
            'This requirement must survive project administration.',
        );

        const deleteResponse = await request.delete(`/admin/projects/${project.id}`, { headers: E2E_ADMIN_HEADERS });

        expect(deleteResponse.status()).toBe(400);
        expect(await deleteResponse.json()).toMatchObject({
            statusCode: 400,
            message: `Project with id "${project.id}" cannot be deleted because it contains requirements.`,
            error: 'Bad Request',
        });

        const requirementResponse = await request.get(`/projects/${project.id}/requirements/${requirement.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });

        expect(requirementResponse.status()).toBe(200);
    });

    test('returns 404 when deleting an unknown project.', async ({ request }) => {
        const unknownProjectId = randomUUID();

        const response = await request.delete(`/admin/projects/${unknownProjectId}`, { headers: E2E_ADMIN_HEADERS });

        expect(response.status()).toBe(404);

        const body = (await response.json()) as ErrorResponseBody;

        expect(body.statusCode).toBe(404);
        expect(body.message).toBe(`Project with id "${unknownProjectId}" was not found.`);
        expect(body.error).toBe('Not Found');
    });
});
