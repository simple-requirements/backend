import { test as base, expect } from '@playwright/test';

import { resetE2eDatabase } from '@/database/seeding/reset-e2e-database';
import { CategoryType } from '@/projects/category-type.enum';
import {
    createCategory,
    createProject,
    createRequirement,
    listCategories,
    type CategoryResponseBody,
    type ProjectResponseBody,
    type RequirementResponseBody,
} from '@/projects/projects-api.e2e-helpers';

export type ProjectsApiFixture = Readonly<{
    createProject(name: string): Promise<ProjectResponseBody>;
    createCategory(projectId: string, name: string, key: string, type?: CategoryType): Promise<CategoryResponseBody>;
    createRequirement(projectId: string, categoryId: string, description?: string): Promise<RequirementResponseBody>;
    listCategories(projectId: string): Promise<readonly CategoryResponseBody[]>;
}>;

type ProjectsApiFixtures = Readonly<{ api: ProjectsApiFixture; resetDatabase: undefined }>;

export const test = base.extend<ProjectsApiFixtures>({
    resetDatabase: [
        // eslint-disable-next-line no-empty-pattern -- Playwright pattern
        async ({}, use) => {

            await resetE2eDatabase();

            await use(undefined);

            await resetE2eDatabase();
        },
        { auto: true },
    ],
    api: async ({ request }, use) => {
        await use({
            createProject: (name: string) => createProject(request, name),
            createCategory: (projectId: string, name: string, key: string, type = CategoryType.FR) =>
                createCategory(request, projectId, name, key, type),
            createRequirement: (projectId: string, categoryId: string, description?: string) =>
                createRequirement(request, projectId, categoryId, description),
            listCategories: (projectId: string) => listCategories(request, projectId),
        });
    },
});

export { expect };
