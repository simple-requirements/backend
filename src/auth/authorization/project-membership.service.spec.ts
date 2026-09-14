import { BadRequestException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountRole } from "@/auth/accounts/account-role.enum";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";
import { ProjectMembership } from "@/auth/authorization/project-membership.entity";
import { ProjectMembershipService } from "@/auth/authorization/project-membership.service";
import { Project } from "@/projects/projects.entity";

function account(role: AccountRole | null, status = UserStatus.Active): User {
  return Object.assign(new User(), {
    id: "user-id",
    username: "member",
    displayName: "Member",
    role,
    status,
  });
}

describe("ProjectMembershipService single-role memberships", () => {
  const projects = { findOneBy: vi.fn() };
  const users = { findOneBy: vi.fn() };
  const memberships = {
    findOneBy: vi.fn(),
    create: vi.fn((value: object) => value),
    save: vi.fn(),
    delete: vi.fn(),
    find: vi.fn(),
    findBy: vi.fn(),
  };
  const dataSource = {
    getRepository: vi.fn((entity: unknown) => {
      if (entity === Project) return projects;
      if (entity === User) return users;
      if (entity === ProjectMembership) return memberships;
      throw new Error("Unexpected repository.");
    }),
  };
  const service = new ProjectMembershipService(
    dataSource as unknown as DataSource,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    projects.findOneBy.mockResolvedValue({ id: "project-id" });
    memberships.findOneBy.mockResolvedValue(null);
    memberships.save.mockResolvedValue(undefined);
  });

  it("creates membership without storing a separate project role.", async () => {
    users.findOneBy.mockResolvedValue(
      account(AccountRole.RequirementsEngineer),
    );

    await expect(service.set("project-id", "user-id")).resolves.toEqual({
      userId: "user-id",
      username: "member",
      displayName: "Member",
      role: AccountRole.RequirementsEngineer,
    });
    expect(memberships.create).toHaveBeenCalledWith({
      projectId: "project-id",
      userId: "user-id",
    });
  });

  it("rejects Administrator memberships.", async () => {
    users.findOneBy.mockResolvedValue(account(AccountRole.Administrator));

    await expect(service.set("project-id", "user-id")).rejects.toEqual(
      new BadRequestException(
        "Administrator accounts cannot receive project memberships.",
      ),
    );
    expect(memberships.save).not.toHaveBeenCalled();
  });

  it("rejects active accounts without a project-scoped role.", async () => {
    users.findOneBy.mockResolvedValue(account(null));

    await expect(service.set("project-id", "user-id")).rejects.toEqual(
      new BadRequestException(
        "The user must have a project-scoped account role before receiving project memberships.",
      ),
    );
  });

  it("rejects memberships for accounts that are not active.", async () => {
    users.findOneBy.mockResolvedValue(
      account(AccountRole.Viewer, UserStatus.Pending),
    );

    await expect(service.set("project-id", "user-id")).rejects.toEqual(
      new BadRequestException(
        "Only active users can receive project memberships.",
      ),
    );
  });
});
