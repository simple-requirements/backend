import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import type { SessionService } from "@/auth/sessions/session.service";

describe("SessionAuthGuard", () => {
  it("authenticates an exact Bearer token and attaches its principal.", async () => {
    const principal = { user: {}, session: {}, globalRoles: [] };
    const sessionService = {
      authenticate: vi.fn().mockResolvedValue(principal),
    };
    const request = { headers: { authorization: "Bearer opaque-token" } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const guard = new SessionAuthGuard(
      sessionService as unknown as SessionService,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(sessionService.authenticate).toHaveBeenCalledWith("opaque-token");
    expect(request).toHaveProperty("authentication", principal);
  });

  it.each([undefined, "Basic value", "Bearer", "Bearer one two"])(
    "rejects malformed authorization value %s.",
    async (authorization) => {
      const sessionService = { authenticate: vi.fn() };
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: { authorization } }),
        }),
      } as ExecutionContext;
      const guard = new SessionAuthGuard(
        sessionService as unknown as SessionService,
      );

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionService.authenticate).not.toHaveBeenCalled();
    },
  );
});
