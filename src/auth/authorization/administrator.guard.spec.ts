import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { AccountRole } from "@/auth/accounts/account-role.enum";
import { AdministratorGuard } from "@/auth/authorization/administrator.guard";

function context(role: AccountRole): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ authentication: { role } }) }),
  } as unknown as ExecutionContext;
}

describe("AdministratorGuard", () => {
  const guard = new AdministratorGuard();

  it("allows an Administrator account.", () => {
    expect(guard.canActivate(context(AccountRole.Administrator))).toBe(true);
  });

  it.each([
    AccountRole.RequirementsEngineer,
    AccountRole.Developer,
    AccountRole.Viewer,
  ])("rejects the non-Administrator role %s.", (role) => {
    expect(() => guard.canActivate(context(role))).toThrow(ForbiddenException);
  });
});
