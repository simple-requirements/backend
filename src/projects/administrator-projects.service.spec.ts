import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectMembershipService } from "@/auth/authorization/project-membership.service";
import { AccountRole } from "@/auth/accounts/account-role.enum";
import { AdministratorProjectsService } from "@/projects/administrator-projects.service";
import type { Category } from "@/projects/categories.entity";
import type { ProjectResponseDto } from "@/projects/dto/project-response.dto";
import type { ProjectsService } from "@/projects/projects.service";
import type { Requirement } from "@/projects/requirements.entity";

const PROJECT_ID = "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b";

function projectResponse(
  overrides: Partial<ProjectResponseDto> = {},
): ProjectResponseDto {
  return {
    id: PROJECT_ID,
    name: "Admin project",
    ticketUrlTemplate: "https://tracker.example/{ticket-id}",
    createdAt: new Date("2026-09-14T06:00:00.000Z"),
    updatedAt: new Date("2026-09-14T06:10:00.000Z"),
    ...overrides,
  };
}

describe("AdministratorProjectsService", () => {
  const projects = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const memberships = { list: vi.fn() };
  const categories = { find: vi.fn() };
  const requirements = { countBy: vi.fn() };
  const service = new AdministratorProjectsService(
    projects as unknown as ProjectsService,
    memberships as unknown as ProjectMembershipService,
    categories as unknown as Repository<Category>,
    requirements as unknown as Repository<Requirement>,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    categories.find.mockResolvedValue([
      { name: "Authentication" },
      { name: "Reporting" },
    ]);
    requirements.countBy.mockResolvedValue(7);
    memberships.list.mockResolvedValue([
      {
        userId: "6f147f85-e0d0-4f23-a8d8-b4a385c5f0f4",
        username: "requirements.engineer",
        displayName: "Requirements Engineer",
        role: AccountRole.RequirementsEngineer,
      },
    ]);
  });

  it("lists summary-only administrative project data.", async () => {
    projects.findAll.mockResolvedValue([projectResponse()]);

    await expect(service.list()).resolves.toEqual([
      {
        id: PROJECT_ID,
        name: "Admin project",
        categoryNames: ["Authentication", "Reporting"],
        categoryCount: 2,
        requirementCount: 7,
        memberships: [
          {
            userId: "6f147f85-e0d0-4f23-a8d8-b4a385c5f0f4",
            username: "requirements.engineer",
            displayName: "Requirements Engineer",
            role: AccountRole.RequirementsEngineer,
          },
        ],
        ticketUrlTemplate: "https://tracker.example/{ticket-id}",
        createdAt: new Date("2026-09-14T06:00:00.000Z"),
        updatedAt: new Date("2026-09-14T06:10:00.000Z"),
      },
    ]);

    expect(categories.find).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID },
      select: { name: true },
      order: { name: "ASC" },
    });
    expect(requirements.countBy).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
    });
    expect(memberships.list).toHaveBeenCalledWith(PROJECT_ID);
  });

  it("returns an empty summary for a newly created project.", async () => {
    projects.create.mockResolvedValue(
      projectResponse({ ticketUrlTemplate: null }),
    );
    categories.find.mockResolvedValue([]);
    requirements.countBy.mockResolvedValue(0);
    memberships.list.mockResolvedValue([]);

    const result = await service.create({ name: "Admin project" });

    expect(projects.create).toHaveBeenCalledWith({ name: "Admin project" });
    expect(result.categoryNames).toEqual([]);
    expect(result.categoryCount).toBe(0);
    expect(result.requirementCount).toBe(0);
    expect(result.memberships).toEqual([]);
  });

  it("delegates administrative updates and deletion to the project domain service.", async () => {
    projects.update.mockResolvedValue(projectResponse({ name: "Renamed" }));
    projects.delete.mockResolvedValue(undefined);

    const updated = await service.update(PROJECT_ID, { name: "Renamed" });
    await service.delete(PROJECT_ID);

    expect(updated.name).toBe("Renamed");
    expect(projects.update).toHaveBeenCalledWith(PROJECT_ID, {
      name: "Renamed",
    });
    expect(projects.delete).toHaveBeenCalledWith(PROJECT_ID);
  });
});
