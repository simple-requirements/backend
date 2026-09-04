import { randomUUID } from "node:crypto";

import { expect, test } from "@/projects/projects-api.e2e-fixtures";

import { CategoryType } from "@/projects/category-type.enum";
import { RequirementStatus } from "@/projects/requirement-status.enum";
import {
  expectErrorResponseBody,
  expectIsoDateString,
  expectRequirementResponseBody,
  type ErrorResponseBody,
  type RequirementResponseBody,
} from "@/projects/projects-api.e2e-helpers";

test.describe("Requirements API - POST /projects/{projectId}/requirements", () => {
  test("creates draft requirements with generated visible keys.", async ({
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API requirement project ${randomUUID()}`,
    );
    const functionalCategory = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
      CategoryType.FR,
    );
    const nonFunctionalCategory = await api.createCategory(
      project.id,
      "Performance",
      "PERF",
      CategoryType.NFR,
    );

    const firstRequirement = await api.createRequirement(
      project.id,
      functionalCategory.id,
      "Users must sign in.",
    );
    const secondRequirement = await api.createRequirement(
      project.id,
      functionalCategory.id,
      "Users must sign out.",
    );
    const thirdRequirement = await api.createRequirement(
      project.id,
      nonFunctionalCategory.id,
      "Search must be fast.",
    );

    expectRequirementResponseBody(firstRequirement, {
      projectId: project.id,
      categoryId: functionalCategory.id,
      visibleKey: "FR-AUTH-0001",
      revisionNumber: 1,
      status: RequirementStatus.Draft,
      description: "Users must sign in.",
      priority: "p1",
      deletedAt: null,
    });
    expect(secondRequirement.visibleKey).toBe("FR-AUTH-0002");
    expect(thirdRequirement.visibleKey).toBe("NFR-PERF-0001");
  });

  test("returns 404 when creating a requirement with a category from another project.", async ({
    request,
    api,
  }) => {
    const firstProject = await api.createProject(
      `Playwright API requirement first project ${randomUUID()}`,
    );
    const secondProject = await api.createProject(
      `Playwright API requirement second project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      secondProject.id,
      "Authentication",
      "AUTH",
      CategoryType.FR,
    );

    const response = await request.post(
      `/projects/${firstProject.id}/requirements`,
      {
        data: { categoryId: category.id, description: "Users must sign in." },
      },
    );

    expect(response.status()).toBe(404);

    const body = (await response.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      404,
      `Category with id "${category.id}" in project "${firstProject.id}" was not found.`,
      "Not Found",
    );
  });
});

test.describe("Requirements API - GET /projects/{projectId}/requirements", () => {
  test("gets and lists requirements of a project.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API list requirements project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
      CategoryType.FR,
    );
    const requirement = await api.createRequirement(project.id, category.id);

    const getResponse = await request.get(
      `/projects/${project.id}/requirements/${requirement.id}`,
    );

    expect(getResponse.status()).toBe(200);

    const getBody = (await getResponse.json()) as RequirementResponseBody;

    expectRequirementResponseBody(getBody, {
      id: requirement.id,
      projectId: project.id,
      categoryId: category.id,
      visibleKey: "FR-AUTH-0001",
      status: RequirementStatus.Draft,
    });

    const listResponse = await request.get(
      `/projects/${project.id}/requirements`,
    );

    expect(listResponse.status()).toBe(200);

    const listBody =
      (await listResponse.json()) as readonly RequirementResponseBody[];

    expect(listBody.map((listedRequirement) => listedRequirement.id)).toContain(
      requirement.id,
    );
  });
});

test.describe("Requirements API - PATCH /projects/{projectId}/requirements/{requirementId}", () => {
  test("approves, implements, and rejects invalid backward transitions.", async ({
    request,
    api,
    draftRequirement,
  }) => {
    const { project, category, requirement } = draftRequirement;

    const approvedRequirement = await api.approveRequirement(
      project.id,
      requirement.id,
    );

    expectRequirementResponseBody(approvedRequirement, {
      id: requirement.id,
      projectId: project.id,
      categoryId: category.id,
      revisionNumber: 2,
      status: RequirementStatus.Approved,
    });
    expect(approvedRequirement.reviewer).toBe("E2E Requirements Engineer");
    expect(approvedRequirement.approvedAt).not.toBeNull();

    if (approvedRequirement.approvedAt !== null) {
      expectIsoDateString(approvedRequirement.approvedAt);
    }

    const rejectApprovedResponse = await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}`,
      {
        data: {
          status: RequirementStatus.Rejected,
          reviewer: "E2E Requirements Engineer",
          rejectionReason: "Not needed.",
        },
      },
    );

    expect(rejectApprovedResponse.status()).toBe(400);

    await api.createImplementationTicket(
      project.id,
      requirement.id,
      "SOLAR-4711",
    );

    const implementResponse = await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}`,
      {
        data: { status: RequirementStatus.Implemented },
      },
    );

    expect(implementResponse.status()).toBe(200);

    const implementedRequirement =
      (await implementResponse.json()) as RequirementResponseBody;

    expect(implementedRequirement.status).toBe(RequirementStatus.Implemented);
    expect(implementedRequirement.revisionNumber).toBe(4);
    expect(implementedRequirement.implementedAt).not.toBeNull();

    if (implementedRequirement.implementedAt !== null) {
      expectIsoDateString(implementedRequirement.implementedAt);
    }
  });

  test("changes an approved requirement by creating a new draft revision.", async ({
    request,
    api,
    draftRequirement,
  }) => {
    const { project, category, requirement } = draftRequirement;

    await api.approveRequirement(project.id, requirement.id);

    const updateResponse = await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}`,
      {
        data: { description: "Users must sign in with MFA.", priority: "p2" },
      },
    );

    expect(updateResponse.status()).toBe(200);

    const updatedRequirement =
      (await updateResponse.json()) as RequirementResponseBody;

    expectRequirementResponseBody(updatedRequirement, {
      id: requirement.id,
      projectId: project.id,
      categoryId: category.id,
      revisionNumber: 3,
      status: RequirementStatus.Draft,
      description: "Users must sign in with MFA.",
      priority: "p2",
    });
    expect(updatedRequirement.reviewer).toBeNull();
    expect(updatedRequirement.approvedAt).toBeNull();
  });

  test("sets an approved requirement obsolete.", async ({
    request,
    api,
    draftRequirement,
  }) => {
    const { project, category, requirement } = draftRequirement;

    await api.approveRequirement(project.id, requirement.id);

    const obsoleteResponse = await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}`,
      {
        data: {
          status: RequirementStatus.Obsolete,
          obsoletedBy: "E2E Requirements Engineer",
          obsolescenceReason: "Replaced by a more specific requirement.",
        },
      },
    );

    expect(obsoleteResponse.status()).toBe(200);

    const obsoleteRequirement =
      (await obsoleteResponse.json()) as RequirementResponseBody;

    expectRequirementResponseBody(obsoleteRequirement, {
      id: requirement.id,
      projectId: project.id,
      categoryId: category.id,
      revisionNumber: 3,
      status: RequirementStatus.Obsolete,
    });
    expect(obsoleteRequirement.obsolescenceReason).toBe(
      "Replaced by a more specific requirement.",
    );
    expect(obsoleteRequirement.obsoletedBy).toBe("E2E Requirements Engineer");
    expect(obsoleteRequirement.reviewer).toBe("E2E Requirements Engineer");
    expect(obsoleteRequirement.obsoleteAt).not.toBeNull();
  });

  test("does not change implemented requirements.", async ({
    request,
    api,
    draftRequirement,
  }) => {
    const { project, requirement } = draftRequirement;

    await api.approveRequirement(project.id, requirement.id);
    await api.createImplementationTicket(
      project.id,
      requirement.id,
      "SOLAR-4712",
    );

    const implementResponse = await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}`,
      {
        data: { status: RequirementStatus.Implemented },
      },
    );
    expect(implementResponse.status()).toBe(200);

    const updateResponse = await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}`,
      {
        data: { description: "Changed after implementation." },
      },
    );

    expect(updateResponse.status()).toBe(400);

    const body = (await updateResponse.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      'Requirement in status "implemented" cannot be changed.',
      "Bad Request",
    );
  });
});

test.describe("Requirements API - DELETE /projects/{projectId}/requirements/{requirementId}", () => {
  test("moves draft requirements into and out of the recycle bin.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API recycle bin project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
      CategoryType.FR,
    );
    const firstRequirement = await api.createRequirement(
      project.id,
      category.id,
      "First draft.",
    );
    const secondRequirement = await api.createRequirement(
      project.id,
      category.id,
      "Second draft.",
    );

    const softDeleteResponse = await request.delete(
      `/projects/${project.id}/requirements/${firstRequirement.id}`,
    );

    expect(softDeleteResponse.status()).toBe(204);
    expect(await softDeleteResponse.text()).toBe("");

    const visibleListResponse = await request.get(
      `/projects/${project.id}/requirements`,
    );
    const visibleListBody =
      (await visibleListResponse.json()) as readonly RequirementResponseBody[];

    expect(
      visibleListBody.map((listedRequirement) => listedRequirement.id),
    ).not.toContain(firstRequirement.id);
    expect(
      visibleListBody.map((listedRequirement) => listedRequirement.id),
    ).toContain(secondRequirement.id);

    const deletedListResponse = await request.get(
      `/projects/${project.id}/requirements?deleted`,
    );
    const deletedListBody =
      (await deletedListResponse.json()) as readonly RequirementResponseBody[];

    expect(
      deletedListBody.map((listedRequirement) => listedRequirement.id),
    ).toEqual([firstRequirement.id]);
    expect(deletedListBody[0]?.deletedAt).not.toBeNull();

    const finalDeleteResponse = await request.delete(
      `/projects/${project.id}/requirements/${firstRequirement.id}?deleted`,
    );

    expect(finalDeleteResponse.status()).toBe(204);

    const deletedListAfterFinalDeleteResponse = await request.get(
      `/projects/${project.id}/requirements?deleted`,
    );
    const deletedListAfterFinalDeleteBody =
      (await deletedListAfterFinalDeleteResponse.json()) as readonly RequirementResponseBody[];

    expect(deletedListAfterFinalDeleteBody).toEqual([]);
  });

  test("does not soft delete approved requirements.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API approved delete project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
      CategoryType.FR,
    );
    const requirement = await api.createRequirement(project.id, category.id);

    const approveResponse = await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}`,
      {
        data: {
          status: RequirementStatus.Approved,
          reviewer: "E2E Requirements Engineer",
        },
      },
    );
    expect(approveResponse.status()).toBe(200);

    const deleteResponse = await request.delete(
      `/projects/${project.id}/requirements/${requirement.id}`,
    );

    expect(deleteResponse.status()).toBe(400);

    const body = (await deleteResponse.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      "Only draft requirements can be deleted.",
      "Bad Request",
    );
  });
});

test.describe("Requirements API - DELETE /projects/{projectId}/requirements", () => {
  test("clears the complete requirement recycle bin.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API clear recycle bin project ${randomUUID()}`,
    );
    const category = await api.createCategory(
      project.id,
      "Authentication",
      "AUTH",
      CategoryType.FR,
    );
    const firstRequirement = await api.createRequirement(
      project.id,
      category.id,
      "First draft.",
    );
    const secondRequirement = await api.createRequirement(
      project.id,
      category.id,
      "Second draft.",
    );

    const firstDeleteResponse = await request.delete(
      `/projects/${project.id}/requirements/${firstRequirement.id}`,
    );
    const secondDeleteResponse = await request.delete(
      `/projects/${project.id}/requirements/${secondRequirement.id}`,
    );

    expect(firstDeleteResponse.status()).toBe(204);
    expect(secondDeleteResponse.status()).toBe(204);

    const clearResponse = await request.delete(
      `/projects/${project.id}/requirements?deleted`,
    );

    expect(clearResponse.status()).toBe(204);

    const deletedListResponse = await request.get(
      `/projects/${project.id}/requirements?deleted`,
    );
    const deletedListBody =
      (await deletedListResponse.json()) as readonly RequirementResponseBody[];

    expect(deletedListBody).toEqual([]);
  });

  test("rejects clearing the recycle bin without the deleted query parameter.", async ({
    request,
    api,
  }) => {
    const project = await api.createProject(
      `Playwright API clear recycle bin missing flag project ${randomUUID()}`,
    );

    const clearResponse = await request.delete(
      `/projects/${project.id}/requirements`,
    );

    expect(clearResponse.status()).toBe(400);

    const body = (await clearResponse.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      "Clearing requirements requires the deleted query parameter.",
      "Bad Request",
    );
  });
});
