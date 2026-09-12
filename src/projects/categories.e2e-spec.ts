import { randomUUID } from "node:crypto";

import { expect, test } from "@/projects/projects-api.e2e-fixtures";

import { CategoryType } from "@/projects/category-type.enum";
import {
  E2E_ADMIN_HEADERS,
  expectCategoryResponseBody,
  expectErrorResponseBody,
  INVALID_CATEGORY_KEYS,
  type CategoryResponseBody,
  type ErrorResponseBody,
} from "@/projects/projects-api.e2e-helpers";

test.describe("Categories API - GET /projects/{projectId}/categories", () => {
  test("lists all categories of a project.", async ({ api }) => {
    const project = await api.createProject(
      `Playwright API list categories project ${randomUUID()}`,
    );
    const firstCategory = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
    );
    const secondCategory = await api.createCategory(
      project.id,
      "Reporting",
      "RPT",
      CategoryType.NFR,
    );

    const body = await api.listCategories(project.id);

    expect(body).toHaveLength(2);
    expect(body.map((category) => category.id)).toEqual([
      firstCategory.id,
      secondCategory.id,
    ]);

    expectCategoryResponseBody(body[0], {
      id: firstCategory.id,
      projectId: project.id,
      name: "Authentication",
      key: "AUTH",
      type: CategoryType.FR,
      createdAt: firstCategory.createdAt,
    });
    expectCategoryResponseBody(body[1], {
      id: secondCategory.id,
      projectId: project.id,
      name: "Reporting",
      key: "RPT",
      type: CategoryType.NFR,
      createdAt: secondCategory.createdAt,
    });
  });

  test("returns categories sorted by name.", async ({ api }) => {
    const project = await api.createProject(
      `Playwright API sorted categories project ${randomUUID()}`,
    );

    await api.createCategory(project.id, "Zeta Category", "ZET");
    await api.createCategory(project.id, "Alpha Category", "ALP");
    await api.createCategory(project.id, "Beta Category", "BET");

    const body = await api.listCategories(project.id);

    expect(body.map((category) => category.name)).toEqual([
      "Alpha Category",
      "Beta Category",
      "Zeta Category",
    ]);
  });

  test("returns an empty array for a project without categories.", async ({
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API empty categories project ${randomUUID()}`,
    );

    const body = await api.listCategories(project.id);

    expect(body).toEqual([]);
  });

  test("returns 403 when the user has no project-content access.", async ({ request }) => {
    const unknownProjectId = randomUUID();

    const response = await request.get(
      `/projects/${unknownProjectId}/categories`,
      { headers: E2E_ADMIN_HEADERS },
    );

    expect(response.status()).toBe(403);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      403,
      "Project access is not permitted.",
      "Forbidden",
    );
  });
});

test.describe("Categories API - POST /projects/{projectId}/categories", () => {
  test("creates a category.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API create category project ${randomUUID()}`,
    );
    const categoryName = `Playwright API category ${randomUUID()}`;

    const response = await request.post(`/projects/${project.id}/categories`, {
      data: { name: categoryName, key: "CAT", type: CategoryType.FR },
    });

    expect(response.status()).toBe(201);

    const body = (await response.json()) as CategoryResponseBody;

    expectCategoryResponseBody(body, {
      projectId: project.id,
      name: categoryName,
      key: "CAT",
      type: CategoryType.FR,
    });
  });

  test("trims the category name.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API trim category project ${randomUUID()}`,
    );
    const categoryName = `Playwright API trimmed category ${randomUUID()}`;

    const response = await request.post(`/projects/${project.id}/categories`, {
      data: { name: `  ${categoryName}  `, key: "TRIM", type: CategoryType.FR },
    });

    expect(response.status()).toBe(201);

    const body = (await response.json()) as CategoryResponseBody;

    expectCategoryResponseBody(body, {
      projectId: project.id,
      name: categoryName,
      key: "TRIM",
      type: CategoryType.FR,
    });
  });

  test("trims and uppercases the category key.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API normalize key project ${randomUUID()}`,
    );

    const response = await request.post(`/projects/${project.id}/categories`, {
      data: {
        name: `Playwright API normalized key category ${randomUUID()}`,
        key: "  auth  ",
        type: CategoryType.NFR,
      },
    });

    expect(response.status()).toBe(201);

    const body = (await response.json()) as CategoryResponseBody;

    expectCategoryResponseBody(body, {
      projectId: project.id,
      name: body.name,
      key: "AUTH",
      type: CategoryType.NFR,
    });
  });

  test("returns 403 when the user has no access to the project.", async ({
    request,
  }) => {
    const unknownProjectId = randomUUID();

    const response = await request.post(
      `/projects/${unknownProjectId}/categories`,
      {
        data: {
          name: `Playwright API category for unknown project ${randomUUID()}`,
          key: "UNK",
          type: CategoryType.FR,
        },
      },
    );

    expect(response.status()).toBe(403);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      403,
      "Project access is not permitted.",
      "Forbidden",
    );
  });

  test("rejects an empty category name.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API empty category name project ${randomUUID()}`,
    );

    const response = await request.post(`/projects/${project.id}/categories`, {
      data: { name: "   ", key: "EMP", type: CategoryType.FR },
    });

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      "Category name must not be empty.",
      "Bad Request",
    );
  });

  for (const { key, testName } of INVALID_CATEGORY_KEYS) {
    test(`rejects an invalid category key because it is ${testName}.`, async ({
      request,
      api,
    }) => {
      const project = await api.createProject(
        `Playwright API invalid category key ${testName} project ${randomUUID()}`,
      );

      const response = await request.post(
        `/projects/${project.id}/categories`,
        {
          data: {
            name: `Playwright API invalid category key ${testName} ${randomUUID()}`,
            key,
            type: CategoryType.FR,
          },
        },
      );

      expect(response.status()).toBe(400);

      const body = (await response.json()) as ErrorResponseBody;

      expectErrorResponseBody(
        body,
        400,
        "Category key must contain 2 to 4 uppercase letters.",
        "Bad Request",
      );
    });
  }

  test("rejects an invalid category type.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API invalid category type project ${randomUUID()}`,
    );

    const response = await request.post(`/projects/${project.id}/categories`, {
      data: {
        name: `Playwright API invalid type category ${randomUUID()}`,
        key: "BUG",
        type: "BUG",
      },
    });

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      "Category type must be either FR or NFR.",
      "Bad Request",
    );
  });

  test("rejects a duplicate category name within the same project.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API duplicate category name project ${randomUUID()}`,
    );
    const categoryName = `Playwright API duplicate name category ${randomUUID()}`;

    await api.createCategory(project.id, categoryName, "ONE");

    const response = await request.post(`/projects/${project.id}/categories`, {
      data: { name: categoryName, key: "TWO", type: CategoryType.NFR },
    });

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      `Category name "${categoryName}" already exists in this project.`,
      "Bad Request",
    );
  });

  test("rejects a duplicate category key within the same project.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API duplicate category key project ${randomUUID()}`,
    );

    await api.createCategory(
      project.id,
      `Playwright API first key category ${randomUUID()}`,
      "DUP",
    );

    const response = await request.post(`/projects/${project.id}/categories`, {
      data: {
        name: `Playwright API second key category ${randomUUID()}`,
        key: "DUP",
        type: CategoryType.NFR,
      },
    });

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      'Category key "DUP" already exists in this project.',
      "Bad Request",
    );
  });

  test("allows the same category name in a different project.", async ({
    api,
  }) => {
    const firstProject = await api.createProject(
      `Playwright API first duplicate-name project ${randomUUID()}`,
    );
    const secondProject = await api.createProject(
      `Playwright API second duplicate-name project ${randomUUID()}`,
    );
    const categoryName = `Playwright API reused category name ${randomUUID()}`;

    const firstCategory = await api.createCategory(
      firstProject.id,
      categoryName,
      "ONE",
    );
    const secondCategory = await api.createCategory(
      secondProject.id,
      categoryName,
      "TWO",
    );

    expect(firstCategory.name).toBe(categoryName);
    expect(secondCategory.name).toBe(categoryName);
    expect(firstCategory.projectId).toBe(firstProject.id);
    expect(secondCategory.projectId).toBe(secondProject.id);
  });
});

test.describe("Categories API - PATCH /projects/{projectId}/categories/{id}", () => {
  test("updates a category name.", async ({ request, categorySetup }) => {
    const { project, category } = categorySetup;
    const updatedCategoryName = `Playwright API updated category ${randomUUID()}`;

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { name: updatedCategoryName },
      },
    );

    expect(response.status()).toBe(200);

    const body = (await response.json()) as CategoryResponseBody;

    expectCategoryResponseBody(body, {
      id: category.id,
      projectId: project.id,
      name: updatedCategoryName,
      key: "AUTH",
      type: CategoryType.FR,
      createdAt: category.createdAt,
    });
  });

  test("updates a category key.", async ({ request, categorySetup }) => {
    const { project, category } = categorySetup;

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { key: "SEC" },
      },
    );

    expect(response.status()).toBe(200);

    const body = (await response.json()) as CategoryResponseBody;

    expectCategoryResponseBody(body, {
      id: category.id,
      projectId: project.id,
      name: "Authentication",
      key: "SEC",
      type: CategoryType.FR,
      createdAt: category.createdAt,
    });
  });

  test("updates a category type.", async ({ request, categorySetup }) => {
    const { project, category } = categorySetup;

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { type: CategoryType.NFR },
      },
    );

    expect(response.status()).toBe(200);

    const body = (await response.json()) as CategoryResponseBody;

    expectCategoryResponseBody(body, {
      id: category.id,
      projectId: project.id,
      name: "Authentication",
      key: "AUTH",
      type: CategoryType.NFR,
      createdAt: category.createdAt,
    });
  });

  test("updates name, key, and type together.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API update full category project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Old category",
      "OLD",
      CategoryType.FR,
    );
    const updatedCategoryName = `Playwright API fully updated category ${randomUUID()}`;

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { name: updatedCategoryName, key: "NEW", type: CategoryType.NFR },
      },
    );

    expect(response.status()).toBe(200);

    const body = (await response.json()) as CategoryResponseBody;

    expectCategoryResponseBody(body, {
      id: category.id,
      projectId: project.id,
      name: updatedCategoryName,
      key: "NEW",
      type: CategoryType.NFR,
      createdAt: category.createdAt,
    });
  });

  test("trims the updated category name.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API trim updated name project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Old category",
      "OLD",
    );
    const updatedCategoryName = `Playwright API trimmed update category ${randomUUID()}`;

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { name: `  ${updatedCategoryName}  ` },
      },
    );

    expect(response.status()).toBe(200);

    const body = (await response.json()) as CategoryResponseBody;

    expect(body.name).toBe(updatedCategoryName);
  });

  test("trims and uppercases the updated category key.", async ({
    request,
    categorySetup,
  }) => {
    const { project, category } = categorySetup;

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { key: "  sec  " },
      },
    );

    expect(response.status()).toBe(200);

    const body = (await response.json()) as CategoryResponseBody;

    expect(body.key).toBe("SEC");
  });

  test("returns 403 when the user has no access to the project.", async ({
    request,
  }) => {
    const unknownProjectId = randomUUID();
    const unknownCategoryId = randomUUID();

    const response = await request.patch(
      `/projects/${unknownProjectId}/categories/${unknownCategoryId}`,
      {
        data: { name: `Playwright API unknown project update ${randomUUID()}` },
      },
    );

    expect(response.status()).toBe(403);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      403,
      "Project access is not permitted.",
      "Forbidden",
    );
  });

  test("returns 404 when the category does not exist in the project.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API missing category project ${randomUUID()}`,
    );
    const unknownCategoryId = randomUUID();

    const response = await request.patch(
      `/projects/${project.id}/categories/${unknownCategoryId}`,
      {
        data: {
          name: `Playwright API unknown category update ${randomUUID()}`,
        },
      },
    );

    expect(response.status()).toBe(404);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      404,
      `Category with id "${unknownCategoryId}" in project "${project.id}" was not found.`,
      "Not Found",
    );
  });

  test("rejects an empty update body.", async ({ request, categorySetup }) => {
    const { project, category } = categorySetup;

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      { data: {} },
    );

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      "At least one category field must be provided.",
      "Bad Request",
    );
  });

  test("rejects an empty updated name.", async ({ request, categorySetup }) => {
    const { project, category } = categorySetup;

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { name: "   " },
      },
    );

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      "Category name must not be empty.",
      "Bad Request",
    );
  });

  for (const { key, testName } of INVALID_CATEGORY_KEYS) {
    test(`rejects an invalid updated key because it is ${testName}.`, async ({
      request,
      api,
    }) => {
      const project = await api.createProject(
        `Playwright API invalid updated key ${testName} project ${randomUUID()}`,
      );
      const category = await api.createCategory(
        project.id,
        "Authentication",
        "AUTH",
      );

      const response = await request.patch(
        `/projects/${project.id}/categories/${category.id}`,
        {
          data: { key },
        },
      );

      expect(response.status()).toBe(400);

      const body = (await response.json()) as ErrorResponseBody;

      expectErrorResponseBody(
        body,
        400,
        "Category key must contain 2 to 4 uppercase letters.",
        "Bad Request",
      );
    });
  }

  test("rejects an invalid updated type.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API invalid updated type project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
    );

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { type: "BUG" },
      },
    );

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      "Category type must be either FR or NFR.",
      "Bad Request",
    );
  });

  test("rejects a duplicate category name within the same project.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API duplicate updated category name project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
    );
    const duplicateCategoryName = `Playwright API duplicate update category ${randomUUID()}`;

    await api.createCategory(project.id, duplicateCategoryName, "SEC");

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { name: duplicateCategoryName },
      },
    );

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      `Category name "${duplicateCategoryName}" already exists in this project.`,
      "Bad Request",
    );
  });

  test("rejects a duplicate category key within the same project.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API duplicate updated category key project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
    );

    await api.createCategory(project.id, "Security", "SEC");

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { key: "SEC" },
      },
    );

    expect(response.status()).toBe(400);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      'Category key "SEC" already exists in this project.',
      "Bad Request",
    );
  });

  test("allows keeping the same name and key on the same category.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API keep same category project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
    );

    const response = await request.patch(
      `/projects/${project.id}/categories/${category.id}`,
      {
        data: { name: "Authentication", key: "AUTH" },
      },
    );

    expect(response.status()).toBe(200);

    const body = (await response.json()) as CategoryResponseBody;

    expectCategoryResponseBody(body, {
      id: category.id,
      projectId: project.id,
      name: "Authentication",
      key: "AUTH",
      type: CategoryType.FR,
      createdAt: category.createdAt,
    });
  });
});

test.describe("Categories API - DELETE /projects/{projectId}/categories/{id}", () => {
  test("deletes a category.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API delete category project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
    );

    const response = await request.delete(
      `/projects/${project.id}/categories/${category.id}`,
    );

    expect(response.status()).toBe(204);
    expect(await response.text()).toBe("");
  });

  test("does not list a deleted category.", async ({ request, api }) => {
    const project = await api.createProject(
      `Playwright API list after delete project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
    );

    const deleteResponse = await request.delete(
      `/projects/${project.id}/categories/${category.id}`,
    );

    expect(deleteResponse.status()).toBe(204);

    const categories = await api.listCategories(project.id);

    expect(
      categories.some((listedCategory) => listedCategory.id === category.id),
    ).toBe(false);
  });

  test("returns 403 when the user has no access to the project.", async ({
    request,
  }) => {
    const unknownProjectId = randomUUID();
    const unknownCategoryId = randomUUID();

    const response = await request.delete(
      `/projects/${unknownProjectId}/categories/${unknownCategoryId}`,
    );

    expect(response.status()).toBe(403);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      403,
      "Project access is not permitted.",
      "Forbidden",
    );
  });

  test("returns 404 when the category does not exist in the project.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API delete unknown category project ${randomUUID()}`,
    );
    const unknownCategoryId = randomUUID();

    const response = await request.delete(
      `/projects/${project.id}/categories/${unknownCategoryId}`,
    );

    expect(response.status()).toBe(404);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      404,
      `Category with id "${unknownCategoryId}" in project "${project.id}" was not found.`,
      "Not Found",
    );
  });
});
