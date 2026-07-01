import { randomUUID } from 'node:crypto';

import { expect, test, type APIRequestContext } from '@playwright/test';
import { isValid, parseISO } from 'date-fns';
import { resetE2eDatabase } from '@/database/seeding/reset-e2e-database';
import { RequirementType } from '@/requirements/requirement-type.enum';

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

interface CategoryResponseBody {
    id: string;
    projectId: string;
    name: string;
    key: string;
    type: RequirementType;
    createdAt: string;
    updatedAt: string;
}

type ExpectedCategoryResponseBody = Readonly<{
    id?: string;
    projectId: string;
    name: string;
    key: string;
    type: RequirementType;
    createdAt?: string;
}>;

const INVALID_CATEGORY_KEYS = [
    { testName: 'too short', key: 'A' },
    { testName: 'too long', key: 'ABCDE' },
    { testName: 'contains digits', key: 'A11Y' },
] as const;

function expectCategoryResponseBody(body: CategoryResponseBody, expectedCategory: ExpectedCategoryResponseBody): void {
    if (expectedCategory.id !== undefined) {
        expect(body.id).toBe(expectedCategory.id);
    } else {
        expect(body.id).toMatch(UUID_REGEX);
    }

    expect(body.projectId).toBe(expectedCategory.projectId);
    expect(body.name).toBe(expectedCategory.name);
    expect(body.key).toBe(expectedCategory.key);
    expect(body.type).toBe(expectedCategory.type);

    if (expectedCategory.createdAt !== undefined) {
        expect(body.createdAt).toBe(expectedCategory.createdAt);
    } else {
        expectIsoDateString(body.createdAt);
    }

    expectIsoDateString(body.updatedAt);
}

function expectErrorResponseBody(
    body: ErrorResponseBody,
    expectedStatusCode: number,
    expectedMessage: string,
    expectedError: string,
): void {
    expect(body.statusCode).toBe(expectedStatusCode);
    expect(body.message).toBe(expectedMessage);
    expect(body.error).toBe(expectedError);
}

async function createCategory(
    request: APIRequestContext,
    projectId: string,
    name: string,
    key: string,
    type: RequirementType = RequirementType.FR,
): Promise<CategoryResponseBody> {
    const response = await request.post(`/projects/${projectId}/categories`, { data: { name, key, type } });

    expect(response.status()).toBe(201);

    return (await response.json()) as CategoryResponseBody;
}

async function listCategories(request: APIRequestContext, projectId: string): Promise<readonly CategoryResponseBody[]> {
    const response = await request.get(`/projects/${projectId}/categories`);

    expect(response.status()).toBe(200);

    return (await response.json()) as readonly CategoryResponseBody[];
}

test.describe('Projects API', () => {
    test.beforeEach(async () => {
        await resetE2eDatabase();
    });

    test.afterAll(async () => {
        await resetE2eDatabase();
    });

    test.describe('GET /projects', () => {
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
    });

    test.describe('GET /projects/{id}', () => {
        test('gets a project.', async ({ request }) => {
            const projectName = `Playwright API get project ${randomUUID()}`;
            const createdProject = await createProject(request, projectName);

            const response = await request.get(`/projects/${createdProject.id}`);

            expect(response.status()).toBe(200);

            const body = (await response.json()) as ProjectResponseBody;

            expect(body.id).toBe(createdProject.id);
            expect(body.createdAt).toBe(createdProject.createdAt);
            expectProjectResponseBody(body, projectName);
        });

        test('returns 404 when the project does not exist.', async ({ request }) => {
            const unknownProjectId = randomUUID();

            const response = await request.get(`/projects/${unknownProjectId}`);

            expect(response.status()).toBe(404);

            const body = (await response.json()) as ErrorResponseBody;

            expect(body.statusCode).toBe(404);
            expect(body.message).toBe(`Project with id "${unknownProjectId}" was not found.`);
            expect(body.error).toBe('Not Found');
        });
    });

    test.describe('POST /projects', () => {
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
    });

    test.describe('PATCH /projects/{id}', () => {
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
    });

    test.describe('DELETE /projects/{id}', () => {
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

    test.describe('Project categories API', () => {
        test.describe('GET /projects/{projectId}/categories', () => {
            test('lists all categories of a project.', async ({ request }) => {
                const project = await createProject(request, `Playwright API list categories project ${randomUUID()}`);
                const firstCategory = await createCategory(request, project.id, 'Authentication', 'AUTH');
                const secondCategory = await createCategory(
                    request,
                    project.id,
                    'Reporting',
                    'RPT',
                    RequirementType.NFR,
                );

                const body = await listCategories(request, project.id);

                expect(body).toHaveLength(2);
                expect(body.map((category) => category.id)).toEqual([firstCategory.id, secondCategory.id]);

                expectCategoryResponseBody(body[0], {
                    id: firstCategory.id,
                    projectId: project.id,
                    name: 'Authentication',
                    key: 'AUTH',
                    type: RequirementType.FR,
                    createdAt: firstCategory.createdAt,
                });
                expectCategoryResponseBody(body[1], {
                    id: secondCategory.id,
                    projectId: project.id,
                    name: 'Reporting',
                    key: 'RPT',
                    type: RequirementType.NFR,
                    createdAt: secondCategory.createdAt,
                });
            });

            test('returns categories sorted by name.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API sorted categories project ${randomUUID()}`,
                );

                await createCategory(request, project.id, 'Zeta Category', 'ZET');
                await createCategory(request, project.id, 'Alpha Category', 'ALP');
                await createCategory(request, project.id, 'Beta Category', 'BET');

                const body = await listCategories(request, project.id);

                expect(body.map((category) => category.name)).toEqual([
                    'Alpha Category',
                    'Beta Category',
                    'Zeta Category',
                ]);
            });

            test('returns an empty array for a project without categories.', async ({ request }) => {
                const project = await createProject(request, `Playwright API empty categories project ${randomUUID()}`);

                const body = await listCategories(request, project.id);

                expect(body).toEqual([]);
            });

            test('returns 404 when the project does not exist.', async ({ request }) => {
                const unknownProjectId = randomUUID();

                const response = await request.get(`/projects/${unknownProjectId}/categories`);

                expect(response.status()).toBe(404);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 404, `Project with id "${unknownProjectId}" was not found.`, 'Not Found');
            });
        });

        test.describe('POST /projects/{projectId}/categories', () => {
            test('creates a category.', async ({ request }) => {
                const project = await createProject(request, `Playwright API create category project ${randomUUID()}`);
                const categoryName = `Playwright API category ${randomUUID()}`;

                const response = await request.post(`/projects/${project.id}/categories`, {
                    data: { name: categoryName, key: 'CAT', type: RequirementType.FR },
                });

                expect(response.status()).toBe(201);

                const body = (await response.json()) as CategoryResponseBody;

                expectCategoryResponseBody(body, {
                    projectId: project.id,
                    name: categoryName,
                    key: 'CAT',
                    type: RequirementType.FR,
                });
            });

            test('trims the category name.', async ({ request }) => {
                const project = await createProject(request, `Playwright API trim category project ${randomUUID()}`);
                const categoryName = `Playwright API trimmed category ${randomUUID()}`;

                const response = await request.post(`/projects/${project.id}/categories`, {
                    data: { name: `  ${categoryName}  `, key: 'TRIM', type: RequirementType.FR },
                });

                expect(response.status()).toBe(201);

                const body = (await response.json()) as CategoryResponseBody;

                expectCategoryResponseBody(body, {
                    projectId: project.id,
                    name: categoryName,
                    key: 'TRIM',
                    type: RequirementType.FR,
                });
            });

            test('trims and uppercases the category key.', async ({ request }) => {
                const project = await createProject(request, `Playwright API normalize key project ${randomUUID()}`);

                const response = await request.post(`/projects/${project.id}/categories`, {
                    data: {
                        name: `Playwright API normalized key category ${randomUUID()}`,
                        key: '  auth  ',
                        type: RequirementType.NFR,
                    },
                });

                expect(response.status()).toBe(201);

                const body = (await response.json()) as CategoryResponseBody;

                expectCategoryResponseBody(body, {
                    projectId: project.id,
                    name: body.name,
                    key: 'AUTH',
                    type: RequirementType.NFR,
                });
            });

            test('returns 404 when the project does not exist.', async ({ request }) => {
                const unknownProjectId = randomUUID();

                const response = await request.post(`/projects/${unknownProjectId}/categories`, {
                    data: {
                        name: `Playwright API category for unknown project ${randomUUID()}`,
                        key: 'UNK',
                        type: RequirementType.FR,
                    },
                });

                expect(response.status()).toBe(404);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 404, `Project with id "${unknownProjectId}" was not found.`, 'Not Found');
            });

            test('rejects an empty category name.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API empty category name project ${randomUUID()}`,
                );

                const response = await request.post(`/projects/${project.id}/categories`, {
                    data: { name: '   ', key: 'EMP', type: RequirementType.FR },
                });

                expect(response.status()).toBe(400);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 400, 'Category name must not be empty.', 'Bad Request');
            });

            for (const { key, testName } of INVALID_CATEGORY_KEYS) {
                test(`rejects an invalid category key because it is ${testName}.`, async ({ request }) => {
                    const project = await createProject(
                        request,
                        `Playwright API invalid category key ${testName} project ${randomUUID()}`,
                    );

                    const response = await request.post(`/projects/${project.id}/categories`, {
                        data: {
                            name: `Playwright API invalid category key ${testName} ${randomUUID()}`,
                            key,
                            type: RequirementType.FR,
                        },
                    });

                    expect(response.status()).toBe(400);

                    const body = (await response.json()) as ErrorResponseBody;

                    expectErrorResponseBody(
                        body,
                        400,
                        'Category key must contain 2 to 4 uppercase letters.',
                        'Bad Request',
                    );
                });
            }

            test('rejects an invalid category type.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API invalid category type project ${randomUUID()}`,
                );

                const response = await request.post(`/projects/${project.id}/categories`, {
                    data: { name: `Playwright API invalid type category ${randomUUID()}`, key: 'BUG', type: 'BUG' },
                });

                expect(response.status()).toBe(400);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 400, 'Category type must be either FR or NFR.', 'Bad Request');
            });

            test('rejects a duplicate category name within the same project.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API duplicate category name project ${randomUUID()}`,
                );
                const categoryName = `Playwright API duplicate name category ${randomUUID()}`;

                await createCategory(request, project.id, categoryName, 'ONE');

                const response = await request.post(`/projects/${project.id}/categories`, {
                    data: { name: categoryName, key: 'TWO', type: RequirementType.NFR },
                });

                expect(response.status()).toBe(400);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(
                    body,
                    400,
                    `Category name "${categoryName}" already exists in this project.`,
                    'Bad Request',
                );
            });

            test('rejects a duplicate category key within the same project.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API duplicate category key project ${randomUUID()}`,
                );

                await createCategory(request, project.id, `Playwright API first key category ${randomUUID()}`, 'DUP');

                const response = await request.post(`/projects/${project.id}/categories`, {
                    data: {
                        name: `Playwright API second key category ${randomUUID()}`,
                        key: 'DUP',
                        type: RequirementType.NFR,
                    },
                });

                expect(response.status()).toBe(400);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 400, 'Category key "DUP" already exists in this project.', 'Bad Request');
            });

            test('allows the same category name in a different project.', async ({ request }) => {
                const firstProject = await createProject(
                    request,
                    `Playwright API first duplicate-name project ${randomUUID()}`,
                );
                const secondProject = await createProject(
                    request,
                    `Playwright API second duplicate-name project ${randomUUID()}`,
                );
                const categoryName = `Playwright API reused category name ${randomUUID()}`;

                const firstCategory = await createCategory(request, firstProject.id, categoryName, 'ONE');
                const secondCategory = await createCategory(request, secondProject.id, categoryName, 'TWO');

                expect(firstCategory.name).toBe(categoryName);
                expect(secondCategory.name).toBe(categoryName);
                expect(firstCategory.projectId).toBe(firstProject.id);
                expect(secondCategory.projectId).toBe(secondProject.id);
            });
        });

        test.describe('PATCH /projects/{projectId}/categories/{id}', () => {
            test('updates a category name.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API update category name project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Old name', 'OLD');
                const updatedCategoryName = `Playwright API updated category ${randomUUID()}`;

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { name: updatedCategoryName },
                });

                expect(response.status()).toBe(200);

                const body = (await response.json()) as CategoryResponseBody;

                expectCategoryResponseBody(body, {
                    id: category.id,
                    projectId: project.id,
                    name: updatedCategoryName,
                    key: 'OLD',
                    type: RequirementType.FR,
                    createdAt: category.createdAt,
                });
            });

            test('updates a category key.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API update category key project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { key: 'SEC' },
                });

                expect(response.status()).toBe(200);

                const body = (await response.json()) as CategoryResponseBody;

                expectCategoryResponseBody(body, {
                    id: category.id,
                    projectId: project.id,
                    name: 'Authentication',
                    key: 'SEC',
                    type: RequirementType.FR,
                    createdAt: category.createdAt,
                });
            });

            test('updates a category type.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API update category type project ${randomUUID()}`,
                );
                const category = await createCategory(
                    request,
                    project.id,
                    'Authentication',
                    'AUTH',
                    RequirementType.FR,
                );

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { type: RequirementType.NFR },
                });

                expect(response.status()).toBe(200);

                const body = (await response.json()) as CategoryResponseBody;

                expectCategoryResponseBody(body, {
                    id: category.id,
                    projectId: project.id,
                    name: 'Authentication',
                    key: 'AUTH',
                    type: RequirementType.NFR,
                    createdAt: category.createdAt,
                });
            });

            test('updates name, key, and type together.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API update full category project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Old category', 'OLD', RequirementType.FR);
                const updatedCategoryName = `Playwright API fully updated category ${randomUUID()}`;

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { name: updatedCategoryName, key: 'NEW', type: RequirementType.NFR },
                });

                expect(response.status()).toBe(200);

                const body = (await response.json()) as CategoryResponseBody;

                expectCategoryResponseBody(body, {
                    id: category.id,
                    projectId: project.id,
                    name: updatedCategoryName,
                    key: 'NEW',
                    type: RequirementType.NFR,
                    createdAt: category.createdAt,
                });
            });

            test('trims the updated category name.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API trim updated name project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Old category', 'OLD');
                const updatedCategoryName = `Playwright API trimmed update category ${randomUUID()}`;

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { name: `  ${updatedCategoryName}  ` },
                });

                expect(response.status()).toBe(200);

                const body = (await response.json()) as CategoryResponseBody;

                expect(body.name).toBe(updatedCategoryName);
            });

            test('trims and uppercases the updated category key.', async ({ request }) => {
                const project = await createProject(request, `Playwright API trim updated key project ${randomUUID()}`);
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { key: '  sec  ' },
                });

                expect(response.status()).toBe(200);

                const body = (await response.json()) as CategoryResponseBody;

                expect(body.key).toBe('SEC');
            });

            test('returns 404 when the project does not exist.', async ({ request }) => {
                const unknownProjectId = randomUUID();
                const unknownCategoryId = randomUUID();

                const response = await request.patch(`/projects/${unknownProjectId}/categories/${unknownCategoryId}`, {
                    data: { name: `Playwright API unknown project update ${randomUUID()}` },
                });

                expect(response.status()).toBe(404);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 404, `Project with id "${unknownProjectId}" was not found.`, 'Not Found');
            });

            test('returns 404 when the category does not exist in the project.', async ({ request }) => {
                const project = await createProject(request, `Playwright API missing category project ${randomUUID()}`);
                const unknownCategoryId = randomUUID();

                const response = await request.patch(`/projects/${project.id}/categories/${unknownCategoryId}`, {
                    data: { name: `Playwright API unknown category update ${randomUUID()}` },
                });

                expect(response.status()).toBe(404);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(
                    body,
                    404,
                    `Category with id "${unknownCategoryId}" in project "${project.id}" was not found.`,
                    'Not Found',
                );
            });

            test('rejects an empty update body.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API empty update body project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, { data: {} });

                expect(response.status()).toBe(400);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 400, 'At least one category field must be provided.', 'Bad Request');
            });

            test('rejects an empty updated name.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API empty updated name project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { name: '   ' },
                });

                expect(response.status()).toBe(400);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 400, 'Category name must not be empty.', 'Bad Request');
            });

            for (const { key, testName } of INVALID_CATEGORY_KEYS) {
                test(`rejects an invalid updated key because it is ${testName}.`, async ({ request }) => {
                    const project = await createProject(
                        request,
                        `Playwright API invalid updated key ${testName} project ${randomUUID()}`,
                    );
                    const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                    const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                        data: { key },
                    });

                    expect(response.status()).toBe(400);

                    const body = (await response.json()) as ErrorResponseBody;

                    expectErrorResponseBody(
                        body,
                        400,
                        'Category key must contain 2 to 4 uppercase letters.',
                        'Bad Request',
                    );
                });
            }

            test('rejects an invalid updated type.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API invalid updated type project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { type: 'BUG' },
                });

                expect(response.status()).toBe(400);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 400, 'Category type must be either FR or NFR.', 'Bad Request');
            });

            test('rejects a duplicate category name within the same project.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API duplicate updated category name project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');
                const duplicateCategoryName = `Playwright API duplicate update category ${randomUUID()}`;

                await createCategory(request, project.id, duplicateCategoryName, 'SEC');

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { name: duplicateCategoryName },
                });

                expect(response.status()).toBe(400);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(
                    body,
                    400,
                    `Category name "${duplicateCategoryName}" already exists in this project.`,
                    'Bad Request',
                );
            });

            test('rejects a duplicate category key within the same project.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API duplicate updated category key project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                await createCategory(request, project.id, 'Security', 'SEC');

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { key: 'SEC' },
                });

                expect(response.status()).toBe(400);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 400, 'Category key "SEC" already exists in this project.', 'Bad Request');
            });

            test('allows keeping the same name and key on the same category.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API keep same category project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                const response = await request.patch(`/projects/${project.id}/categories/${category.id}`, {
                    data: { name: 'Authentication', key: 'AUTH' },
                });

                expect(response.status()).toBe(200);

                const body = (await response.json()) as CategoryResponseBody;

                expectCategoryResponseBody(body, {
                    id: category.id,
                    projectId: project.id,
                    name: 'Authentication',
                    key: 'AUTH',
                    type: RequirementType.FR,
                    createdAt: category.createdAt,
                });
            });
        });

        test.describe('DELETE /projects/{projectId}/categories/{id}', () => {
            test('deletes a category.', async ({ request }) => {
                const project = await createProject(request, `Playwright API delete category project ${randomUUID()}`);
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                const response = await request.delete(`/projects/${project.id}/categories/${category.id}`);

                expect(response.status()).toBe(204);
                expect(await response.text()).toBe('');
            });

            test('does not list a deleted category.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API list after delete project ${randomUUID()}`,
                );
                const category = await createCategory(request, project.id, 'Authentication', 'AUTH');

                const deleteResponse = await request.delete(`/projects/${project.id}/categories/${category.id}`);

                expect(deleteResponse.status()).toBe(204);

                const categories = await listCategories(request, project.id);

                expect(categories.some((listedCategory) => listedCategory.id === category.id)).toBe(false);
            });

            test('returns 404 when the project does not exist.', async ({ request }) => {
                const unknownProjectId = randomUUID();
                const unknownCategoryId = randomUUID();

                const response = await request.delete(`/projects/${unknownProjectId}/categories/${unknownCategoryId}`);

                expect(response.status()).toBe(404);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(body, 404, `Project with id "${unknownProjectId}" was not found.`, 'Not Found');
            });

            test('returns 404 when the category does not exist in the project.', async ({ request }) => {
                const project = await createProject(
                    request,
                    `Playwright API delete unknown category project ${randomUUID()}`,
                );
                const unknownCategoryId = randomUUID();

                const response = await request.delete(`/projects/${project.id}/categories/${unknownCategoryId}`);

                expect(response.status()).toBe(404);

                const body = (await response.json()) as ErrorResponseBody;

                expectErrorResponseBody(
                    body,
                    404,
                    `Category with id "${unknownCategoryId}" in project "${project.id}" was not found.`,
                    'Not Found',
                );
            });
        });
    });
});
