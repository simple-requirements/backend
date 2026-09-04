import { describe, expect, it } from "vitest";

import { SessionTokenService } from "@/auth/sessions/session-token.service";

describe("SessionTokenService", () => {
  const service = new SessionTokenService();

  it("generates distinct opaque tokens and matching SHA-256 hashes.", () => {
    const first = service.generate();
    const second = service.generate();

    expect(first.plaintext).not.toBe(second.plaintext);
    expect(first.hash).toMatch(/^[a-f\d]{64}$/);
    expect(first.hash).toBe(service.hash(first.plaintext));
    expect(first.hash).not.toContain(first.plaintext);
  });
});
