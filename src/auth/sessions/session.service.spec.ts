import { UnauthorizedException } from "@nestjs/common";
import type { DataSource, EntityManager } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { AuthenticationSession } from "@/auth/sessions/authentication-session.entity";
import { GlobalUserRole } from "@/auth/authorization/global-user-role.entity";
import { LoginAttempt } from "@/auth/sessions/login-attempt.entity";
import type { PasswordService } from "@/auth/accounts/password.service";
import { SessionService } from "@/auth/sessions/session.service";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";

describe("SessionService login", () => {
  function setup(user: User | null, passwordMatches: boolean) {
    const attempts = {
      count: vi.fn().mockResolvedValue(0),
      save: vi.fn().mockResolvedValue(undefined),
      create: vi.fn((value) => value),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const users = { findOneBy: vi.fn().mockResolvedValue(user) };
    const sessions = {
      create: vi.fn((value) => value),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const roles = { findBy: vi.fn().mockResolvedValue([]) };
    const manager = {
      query: vi.fn().mockResolvedValue(undefined),
      getRepository: vi.fn((entity: unknown) => {
        if (entity === LoginAttempt) return attempts;
        if (entity === User) return users;
        if (entity === AuthenticationSession) return sessions;
        if (entity === GlobalUserRole) return roles;
        throw new Error("Unexpected repository.");
      }),
    };
    const dataSource = {
      transaction: vi.fn((callback: (manager: EntityManager) => unknown) =>
        Promise.resolve(callback(manager as unknown as EntityManager)),
      ),
    };
    const passwordService = {
      verify: vi.fn().mockResolvedValue(passwordMatches),
    };
    const tokenService = {
      generate: vi
        .fn()
        .mockReturnValue({ plaintext: "opaque", hash: "a".repeat(64) }),
      hash: vi.fn(),
    };
    const service = new SessionService(
      dataSource as unknown as DataSource,
      passwordService as unknown as PasswordService,
      tokenService,
    );
    return { service, attempts, sessions, passwordService };
  }

  it("creates a session using only the generated token hash for an eligible user.", async () => {
    const user = Object.assign(new User(), {
      id: "user-id",
      username: "User",
      normalizedUsername: "user",
      email: "u@example.org",
      displayName: "User",
      passwordHash: "encoded",
      status: UserStatus.Active,
      emailVerifiedAt: new Date(),
    });
    const { service, sessions, passwordService } = setup(user, true);

    await expect(
      service.login({ username: " USER ", password: "password" }, "127.0.0.1"),
    ).resolves.toMatchObject({
      accessToken: "opaque",
      user: { id: "user-id" },
    });
    expect(passwordService.verify).toHaveBeenCalledWith("encoded", "password");
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: "a".repeat(64), userId: "user-id" }),
    );
    expect(sessions.create.mock.calls[0]?.[0]).not.toHaveProperty("plaintext");
  });

  it.each([
    [null, true],
    [
      Object.assign(new User(), {
        normalizedUsername: "user",
        passwordHash: "encoded",
        status: UserStatus.Pending,
        emailVerifiedAt: null,
      }),
      true,
    ],
    [
      Object.assign(new User(), {
        normalizedUsername: "user",
        passwordHash: "encoded",
        status: UserStatus.Active,
        emailVerifiedAt: new Date(),
      }),
      false,
    ],
  ])(
    "returns the same failure for unknown, unavailable, and invalid credentials.",
    async (user, passwordMatches) => {
      const { service, attempts } = setup(user, passwordMatches);
      await expect(
        service.login({ username: "user", password: "wrong" }, "127.0.0.1"),
      ).rejects.toEqual(
        new UnauthorizedException("Invalid username or password."),
      );
      expect(attempts.save).toHaveBeenCalledOnce();
    },
  );
});
