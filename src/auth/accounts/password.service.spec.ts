import { describe, expect, it } from "vitest";

import { PasswordService } from "@/auth/accounts/password.service";

describe("PasswordService", () => {
  const passwordService = new PasswordService();
  const password = "correct horse battery staple";

  it("creates an Argon2id hash that verifies the original password.", async () => {
    const passwordHash = await passwordService.hash(password);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(passwordService.verify(passwordHash, password)).resolves.toBe(
      true,
    );
    await expect(
      passwordService.verify(passwordHash, "different password"),
    ).resolves.toBe(false);
  });

  it("uses a different salt for equal passwords.", async () => {
    const [firstHash, secondHash] = await Promise.all([
      passwordService.hash(password),
      passwordService.hash(password),
    ]);

    expect(firstHash).not.toBe(secondHash);
  });
});
