import { describe, expect, it } from "vitest";

import { VerificationTokenService } from "@/auth/registration/verification-token.service";

describe("VerificationTokenService", () => {
  const service = new VerificationTokenService();

  it("generates 256 random bits and stores a deterministic SHA-256 representation.", () => {
    const first = service.generate();
    const second = service.generate();

    expect(Buffer.from(first.plaintext, "base64url")).toHaveLength(32);
    expect(first.plaintext).not.toBe(second.plaintext);
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.hash).toBe(service.hash(first.plaintext));
    expect(first.hash).not.toContain(first.plaintext);
  });
});
