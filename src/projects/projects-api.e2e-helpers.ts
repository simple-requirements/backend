import { expect, type APIRequestContext } from "@playwright/test";
import { isValid, parseISO } from "date-fns";

import { CategoryType } from "@/projects/category-type.enum";
import { RequirementStatus } from "@/projects/requirement-status.enum";
import {
  E2E_ADMIN_ACCESS_TOKEN,
  E2E_ADMIN_USER_ID,
  E2E_DEVELOPER_USER_ID,
  E2E_REQUIREMENTS_ENGINEER_ACCESS_TOKEN,
  E2E_REQUIREMENTS_ENGINEER_USER_ID,
  E2E_VIEWER_USER_ID,
} from "@/database/seeding/seed-e2e-authentication";

export interface ProjectResponseBody {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const E2E_ADMIN_HEADERS = {
  Authorization: `Bearer ${E2E_ADMIN_ACCESS_TOKEN}`,
} as const;

export const E2E_REQUIREMENTS_ENGINEER_HEADERS = {
  Authorization: `Bearer ${E2E_REQUIREMENTS_ENGINEER_ACCESS_TOKEN}`,
} as const;


export function expectIsoDateString(value: string): void {
  const parsedDate = parseISO(value);

  expect(isValid(parsedDate)).toBe(true);
  expect(parsedDate.toISOString()).toBe(value);
}

export function expectProjectResponseBody(
  body: ProjectResponseBody,
  expectedName: string,
): void {
  expect(body.id).toMatch(UUID_REGEX);
  expect(body.name).toBe(expectedName);
  expectIsoDateString(body.createdAt);
  expectIsoDateString(body.updatedAt);
}

export async function createProject(
  request: APIRequestContext,
  name: string,
): Promise<ProjectResponseBody> {
  const response = await request.post("/projects", {
    data: { name },
    headers: E2E_ADMIN_HEADERS,
  });

  expect(response.status()).toBe(201);

  const project = (await response.json()) as ProjectResponseBody;
  const memberships = await Promise.all([
    request.put(`/admin/projects/${project.id}/memberships/${E2E_ADMIN_USER_ID}`, {
      data: { roles: ["viewer"] },
      headers: E2E_ADMIN_HEADERS,
    }),
    request.put(
      `/admin/projects/${project.id}/memberships/${E2E_REQUIREMENTS_ENGINEER_USER_ID}`,
      {
        data: { roles: ["requirements_engineer"] },
        headers: E2E_ADMIN_HEADERS,
      },
    ),
    request.put(
      `/admin/projects/${project.id}/memberships/${E2E_DEVELOPER_USER_ID}`,
      { data: { roles: ["developer"] }, headers: E2E_ADMIN_HEADERS },
    ),
    request.put(`/admin/projects/${project.id}/memberships/${E2E_VIEWER_USER_ID}`, {
      data: { roles: ["viewer"] },
      headers: E2E_ADMIN_HEADERS,
    }),
  ]);

  expect(memberships.map((membership) => membership.status())).toEqual([
    200, 200, 200, 200,
  ]);
  return project;
}

export interface CategoryResponseBody {
  id: string;
  projectId: string;
  name: string;
  key: string;
  type: CategoryType;
  createdAt: string;
  updatedAt: string;
}

export type ExpectedCategoryResponseBody = Readonly<{
  id?: string;
  projectId: string;
  name: string;
  key: string;
  type: CategoryType;
  createdAt?: string;
}>;

export const INVALID_CATEGORY_KEYS = [
  { testName: "too short", key: "A" },
  { testName: "too long", key: "ABCDE" },
  { testName: "contains digits", key: "A11Y" },
] as const;

export function expectCategoryResponseBody(
  body: CategoryResponseBody,
  expectedCategory: ExpectedCategoryResponseBody,
): void {
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

export function expectErrorResponseBody(
  body: ErrorResponseBody,
  expectedStatusCode: number,
  expectedMessage: string,
  expectedError: string,
): void {
  expect(body.statusCode).toBe(expectedStatusCode);
  expect(body.message).toBe(expectedMessage);
  expect(body.error).toBe(expectedError);
}

export async function createCategory(
  request: APIRequestContext,
  projectId: string,
  name: string,
  key: string,
  type: CategoryType = CategoryType.FR,
): Promise<CategoryResponseBody> {
  const response = await request.post(`/projects/${projectId}/categories`, {
    data: { name, key, type },
    headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
  });

  expect(response.status()).toBe(201);

  return (await response.json()) as CategoryResponseBody;
}

export interface RequirementResponseBody {
  id: string;
  projectId: string;
  categoryId: string;
  sequenceNumber: number;
  visibleKey: string;
  revisionNumber: number;
  status: RequirementStatus;
  description: string | null;
  priority: string | null;
  owner: string | null;
  rationale: string | null;
  source: string | null;
  rejectionReason: string | null;
  reviewer: string | null;
  obsoletedBy: string | null;
  implementationTickets: ImplementationTicketResponseBody[];
  rejectedAt: string | null;
  deletedAt: string | null;
  approvedAt: string | null;
  implementedAt: string | null;
  obsolescenceReason: string | null;
  obsoleteAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImplementationTicketResponseBody {
  id: string;
  requirementId: string;
  ticketId: string;
  completedBy: string;
  completedAt: string;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ExpectedRequirementResponseBody = Readonly<{
  id?: string;
  projectId: string;
  categoryId: string;
  visibleKey?: string;
  revisionNumber?: number;
  status?: RequirementStatus;
  description?: string | null;
  priority?: string | null;
  deletedAt?: string | null;
}>;

export function expectNullableIsoDateString(value: string | null): void {
  if (value !== null) {
    expectIsoDateString(value);
  }
}

export function expectRequirementResponseBody(
  body: RequirementResponseBody,
  expectedRequirement: ExpectedRequirementResponseBody,
): void {
  if (expectedRequirement.id !== undefined) {
    expect(body.id).toBe(expectedRequirement.id);
  } else {
    expect(body.id).toMatch(UUID_REGEX);
  }

  expect(body.projectId).toBe(expectedRequirement.projectId);
  expect(body.categoryId).toBe(expectedRequirement.categoryId);
  expect(body.visibleKey).toMatch(/^(FR|NFR)-[A-Z]{2,4}-\d{4}$/);

  if (expectedRequirement.visibleKey !== undefined) {
    expect(body.visibleKey).toBe(expectedRequirement.visibleKey);
  }

  if (expectedRequirement.revisionNumber !== undefined) {
    expect(body.revisionNumber).toBe(expectedRequirement.revisionNumber);
  }

  if (expectedRequirement.status !== undefined) {
    expect(body.status).toBe(expectedRequirement.status);
  }

  if (expectedRequirement.description !== undefined) {
    expect(body.description).toBe(expectedRequirement.description);
  }

  if (expectedRequirement.priority !== undefined) {
    expect(body.priority).toBe(expectedRequirement.priority);
  }

  if (expectedRequirement.deletedAt !== undefined) {
    expect(body.deletedAt).toBe(expectedRequirement.deletedAt);
  }

  expectIsoDateString(body.createdAt);
  expectIsoDateString(body.updatedAt);
  expectNullableIsoDateString(body.rejectedAt);
  expectNullableIsoDateString(body.deletedAt);
  expectNullableIsoDateString(body.approvedAt);
  expectNullableIsoDateString(body.implementedAt);
  expectNullableIsoDateString(body.obsoleteAt);
}

export async function createRequirement(
  request: APIRequestContext,
  projectId: string,
  categoryId: string,
  description = "Users must sign in.",
): Promise<RequirementResponseBody> {
  const response = await request.post(`/projects/${projectId}/requirements`, {
    data: { categoryId, description, priority: "p1" },
    headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
  });

  expect(response.status()).toBe(201);

  return (await response.json()) as RequirementResponseBody;
}

export async function approveRequirement(
  request: APIRequestContext,
  projectId: string,
  requirementId: string,
  reviewer = "Requirements Engineer",
): Promise<RequirementResponseBody> {
  const response = await request.patch(
    `/projects/${projectId}/requirements/${requirementId}`,
    {
      data: { status: RequirementStatus.Approved, reviewer },
      headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
    },
  );

  expect(response.status()).toBe(200);

  return (await response.json()) as RequirementResponseBody;
}

export async function createImplementationTicket(
  request: APIRequestContext,
  projectId: string,
  requirementId: string,
  ticketId: string,
): Promise<ImplementationTicketResponseBody> {
  const response = await request.post(
    `/projects/${projectId}/requirements/${requirementId}/implementation-tickets`,
    {
      data: {
        ticketId,
        completedBy: "Requirements Engineer",
        completedAt: "2026-08-25",
      },
      headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
    },
  );

  expect(response.status()).toBe(201);

  return (await response.json()) as ImplementationTicketResponseBody;
}

export async function listCategories(
  request: APIRequestContext,
  projectId: string,
): Promise<readonly CategoryResponseBody[]> {
  const response = await request.get(`/projects/${projectId}/categories`, {
    headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
  });

  expect(response.status()).toBe(200);

  return (await response.json()) as readonly CategoryResponseBody[];
}
