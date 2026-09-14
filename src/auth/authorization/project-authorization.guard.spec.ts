import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { DataSource } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { AccountRole } from "@/auth/accounts/account-role.enum";
import { ProjectAuthorizationGuard } from "@/auth/authorization/project-authorization.guard";
import { ProjectPermission } from "@/auth/authorization/project-permission";

function setup(
  permission: ProjectPermission,
  role: AccountRole,
  hasMembership = false,
) {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(permission) };
  const repository = {
    findOneBy: vi
      .fn()
      .mockResolvedValue(hasMembership ? { id: "membership" } : null),
  };
  const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
  const request = {
    params: { projectId: "project-id" },
    authentication: { user: { id: "user-id" }, role },
  };
  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return {
    guard: new ProjectAuthorizationGuard(
      reflector as unknown as Reflector,
      dataSource as unknown as DataSource,
    ),
    context,
    repository,
  };
}

describe("ProjectAuthorizationGuard", () => {
  it.each([ProjectPermission.ReadProject, ProjectPermission.Read])(
    "rejects Administrator access to project-scoped permission %s.",
    async (permission) => {
      const content = setup(permission, AccountRole.Administrator);
      await expect(
        content.guard.canActivate(content.context),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(content.repository.findOneBy).not.toHaveBeenCalled();
    },
  );

  it.each([
    [ProjectPermission.Read, AccountRole.Viewer],
    [ProjectPermission.ReadProject, AccountRole.Developer],
    [ProjectPermission.ManageRequirements, AccountRole.RequirementsEngineer],
    [ProjectPermission.ManageTickets, AccountRole.Developer],
  ])(
    "allows %s through the matching project-scoped role with membership.",
    async (permission, role) => {
      const { guard, context } = setup(permission, role, true);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    },
  );

  it("rejects project-scoped access without membership.", async () => {
    const { guard, context } = setup(
      ProjectPermission.Read,
      AccountRole.RequirementsEngineer,
      false,
    );
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("does not allow Developer accounts to mutate requirement content.", async () => {
    const { guard, context } = setup(
      ProjectPermission.ManageRequirements,
      AccountRole.Developer,
      true,
    );
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
