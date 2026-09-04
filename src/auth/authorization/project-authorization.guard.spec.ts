import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { DataSource } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { ProjectAuthorizationGuard } from "@/auth/authorization/project-authorization.guard";
import { ProjectPermission } from "@/auth/authorization/project-permission";
import { ProjectRole } from "@/auth/authorization/project-role.enum";

function setup(
  permission: ProjectPermission,
  roles: ProjectRole[] = [],
  globalRoles: GlobalRole[] = [],
) {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(permission) };
  const repository = {
    findBy: vi.fn().mockResolvedValue(roles.map((role) => ({ role }))),
  };
  const dataSource = { getRepository: vi.fn().mockReturnValue(repository) };
  const request = {
    params: { projectId: "project-id" },
    authentication: { user: { id: "user-id" }, globalRoles },
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
  };
}

describe("ProjectAuthorizationGuard", () => {
  it("allows global Administrators to read and administer projects.", async () => {
    for (const permission of [
      ProjectPermission.Read,
      ProjectPermission.Administer,
    ]) {
      const { guard, context } = setup(
        permission,
        [],
        [GlobalRole.Administrator],
      );
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });
  it.each([
    [ProjectPermission.Read, ProjectRole.Viewer],
    [ProjectPermission.ManageRequirements, ProjectRole.RequirementsEngineer],
    [ProjectPermission.ManageTickets, ProjectRole.Developer],
  ])(
    "allows %s through the matching project role.",
    async (permission, role) => {
      const { guard, context } = setup(permission, [role]);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    },
  );
  it("rejects an Administrator requirement mutation without project membership.", async () => {
    const { guard, context } = setup(
      ProjectPermission.ManageRequirements,
      [],
      [GlobalRole.Administrator],
    );
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it("rejects authentication without project membership.", async () => {
    const { guard, context } = setup(ProjectPermission.Read);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
