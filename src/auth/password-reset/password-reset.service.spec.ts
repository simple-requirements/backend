import type { DataSource } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import type { EmailDeliveryService } from "@/auth/registration/email-delivery.service";
import type { PasswordService } from "@/auth/accounts/password.service";
import { PasswordResetService } from "@/auth/password-reset/password-reset.service";
import type { SessionService } from "@/auth/sessions/session.service";

describe("PasswordResetService", () => {
  function setup(user: unknown) {
    const attempts = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn((value) => value),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const users = { findOneBy: vi.fn().mockResolvedValue(user) };
    const resetTokens = {
      update: vi.fn().mockResolvedValue(undefined),
      create: vi.fn((value) => value),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const getRepository = (entity: { name: string }) => {
      if (entity.name === "PasswordResetAttempt") return attempts;
      if (entity.name === "User") return users;
      return resetTokens;
    };
    const dataSource = { getRepository: vi.fn(getRepository) };
    const tokens = {
      generate: vi
        .fn()
        .mockReturnValue({ plaintext: "plain-token", hash: "hashed-token" }),
      hash: vi.fn(),
    };
    const email = { sendPasswordReset: vi.fn().mockResolvedValue(undefined) };
    const service = new PasswordResetService(
      dataSource as unknown as DataSource,
      tokens,
      {} as PasswordService,
      {} as SessionService,
      email as unknown as EmailDeliveryService,
    );
    return { service, attempts, resetTokens, email };
  }
  it("returns the same non-enumerating response for an unknown email.", async () => {
    const { service, email } = setup(null);
    await expect(
      service.request("missing@example.org", "source"),
    ).resolves.toEqual({
      message:
        "If the account is eligible, a password reset email will be sent.",
    });
    expect(email.sendPasswordReset).not.toHaveBeenCalled();
  });
  it("stores only a token hash and emails the plaintext token to an eligible user.", async () => {
    const user = {
      id: "user-id",
      email: "user@example.org",
      displayName: "User",
      emailVerifiedAt: new Date(),
      status: "active",
    };
    const { service, resetTokens, email } = setup(user);
    await service.request(user.email, "source");
    expect(resetTokens.create).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: "hashed-token", userId: "user-id" }),
    );
    expect(resetTokens.create.mock.calls[0]?.[0]).not.toHaveProperty(
      "plaintext",
    );
    expect(email.sendPasswordReset).toHaveBeenCalledWith(
      user.email,
      user.displayName,
      "plain-token",
    );
  });
});
