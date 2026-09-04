import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { AdministratorGuard } from "@/auth/authorization/administrator.guard";
import { GlobalRole } from "@/auth/authorization/global-role.enum";

function context(globalRoles: GlobalRole[]): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ authentication: { globalRoles } }),
    }),
  } as ExecutionContext;
}

describe("AdministratorGuard", () => {
  const guard = new AdministratorGuard();

  it("allows a global Administrator.", () => {
    expect(guard.canActivate(context([GlobalRole.Administrator]))).toBe(true);
  });

  it("rejects an authenticated user without the Administrator role.", () => {
    expect(() => guard.canActivate(context([]))).toThrow(ForbiddenException);
  });
});
