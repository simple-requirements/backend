import { randomUUID } from "node:crypto";

import { test as base, expect } from "@playwright/test";

import { resetE2eDatabase } from "@/database/seeding/reset-e2e-database";
import { CategoryType } from "@/projects/category-type.enum";
import {
  approveRequirement,
  createCategory,
  createImplementationTicket,
  createProject,
  createRequirement,
  listCategories,
  type CategoryResponseBody,
  type ImplementationTicketResponseBody,
  type ProjectResponseBody,
  type RequirementResponseBody,
} from "@/projects/projects-api.e2e-helpers";

export type ProjectsApiFixture = Readonly<{
  approveRequirement(
    projectId: string,
    requirementId: string,
    reviewer?: string,
  ): Promise<RequirementResponseBody>;
  createProject(name: string): Promise<ProjectResponseBody>;
  createCategory(
    projectId: string,
    name: string,
    key: string,
    type?: CategoryType,
  ): Promise<CategoryResponseBody>;
  createRequirement(
    projectId: string,
    categoryId: string,
    description?: string,
  ): Promise<RequirementResponseBody>;
  createImplementationTicket(
    projectId: string,
    requirementId: string,
    ticketId: string,
  ): Promise<ImplementationTicketResponseBody>;
  listCategories(projectId: string): Promise<readonly CategoryResponseBody[]>;
}>;

export type DraftRequirementSetup = Readonly<{
  project: ProjectResponseBody;
  category: CategoryResponseBody;
  requirement: RequirementResponseBody;
}>;

export type CategorySetup = Readonly<{
  project: ProjectResponseBody;
  category: CategoryResponseBody;
}>;

type ProjectsApiFixtures = Readonly<{
  api: ProjectsApiFixture;
  categorySetup: CategorySetup;
  draftRequirement: DraftRequirementSetup;
  project: ProjectResponseBody;
  resetDatabase: undefined;
}>;

export const test = base.extend<ProjectsApiFixtures>({
  resetDatabase: [
    // eslint-disable-next-line no-empty-pattern -- Playwright pattern
    async ({}, use, testInfo) => {
      const normalizedTestFile = testInfo.file.replaceAll("\\", "/");
      const isAuthenticationSpec = normalizedTestFile.endsWith(
        "/auth/auth.e2e-spec.ts",
      );

      await resetE2eDatabase({ includeAuthentication: !isAuthenticationSpec });

      await use(undefined);
    },
    { auto: true },
  ],
  api: async ({ request }, use) => {
    await use({
      approveRequirement: (
        projectId: string,
        requirementId: string,
        reviewer?: string,
      ) => approveRequirement(request, projectId, requirementId, reviewer),
      createProject: (name: string) => createProject(request, name),
      createCategory: (
        projectId: string,
        name: string,
        key: string,
        type = CategoryType.FR,
      ) => createCategory(request, projectId, name, key, type),
      createRequirement: (
        projectId: string,
        categoryId: string,
        description?: string,
      ) => createRequirement(request, projectId, categoryId, description),
      createImplementationTicket: (
        projectId: string,
        requirementId: string,
        ticketId: string,
      ) =>
        createImplementationTicket(request, projectId, requirementId, ticketId),
      listCategories: (projectId: string) => listCategories(request, projectId),
    });
  },
  project: async ({ api }, use) => {
    await use(
      await api.createProject(`Playwright API project fixture ${randomUUID()}`),
    );
  },
  categorySetup: async ({ api, project }, use) => {
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
    );

    await use({ project, category });
  },
  draftRequirement: async ({ api, categorySetup }, use) => {
    const { project, category } = categorySetup;
    const requirement = await api.createRequirement(
      project.id,
      category.id,
      "Original draft.",
    );

    await use({ project, category, requirement });
  },
});

export { expect };
