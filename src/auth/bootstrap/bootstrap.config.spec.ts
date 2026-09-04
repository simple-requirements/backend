import { afterEach, describe, expect, it, vi } from "vitest";

import { loadBootstrapConfiguration } from "@/auth/bootstrap/bootstrap.config";

describe("bootstrap configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("provides a test-only secret without production configuration.", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("INITIAL_ADMIN_BOOTSTRAP_SECRET", undefined);
    const configuration = loadBootstrapConfiguration();

    expect(configuration.secret).not.toBeNull();

    if (configuration.secret === null) {
      throw new Error("Expected the test environment to provide a secret.");
    }

    expect(configuration.secret.length).toBeGreaterThanOrEqual(32);
  });

  it("allows a removed secret after bootstrap and rejects weak values.", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INITIAL_ADMIN_BOOTSTRAP_SECRET", undefined);

    expect(loadBootstrapConfiguration()).toEqual({ secret: null });

    vi.stubEnv("INITIAL_ADMIN_BOOTSTRAP_SECRET", "too-short");

    expect(loadBootstrapConfiguration).toThrow(
      "INITIAL_ADMIN_BOOTSTRAP_SECRET must contain at least 32 characters",
    );
  });

  it("loads the configured deployment secret.", () => {
    const secret = "a".repeat(32);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INITIAL_ADMIN_BOOTSTRAP_SECRET", secret);

    expect(loadBootstrapConfiguration()).toEqual({ secret });
  });
});
