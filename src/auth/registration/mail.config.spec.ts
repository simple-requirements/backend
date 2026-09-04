import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMailConfiguration } from "@/auth/registration/mail.config";

const SMTP_CREDENTIAL = ["smtp", "credential"].join("-");

const PRODUCTION_CONFIGURATION = {
  FRONTEND_BASE_URL: "https://requirements.example/app/",
  SMTP_FROM: "requirements@example.org",
  SMTP_HOST: "smtp.example.org",
  SMTP_PASSWORD: SMTP_CREDENTIAL,
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USER: "smtp-user",
};

function configureProductionEnvironment(): void {
  vi.stubEnv("NODE_ENV", "production");

  for (const [name, value] of Object.entries(PRODUCTION_CONFIGURATION)) {
    vi.stubEnv(name, value);
  }
}

describe("mail configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disables external delivery in the test environment.", () => {
    vi.stubEnv("NODE_ENV", "test");

    expect(loadMailConfiguration()).toMatchObject({
      disabled: true,
      frontendBaseUrl: "http://localhost:5173/",
      host: "localhost",
      port: 587,
      secure: false,
    });
  });

  it("loads the complete SMTP configuration outside the test environment.", () => {
    configureProductionEnvironment();

    expect(loadMailConfiguration()).toEqual({
      disabled: false,
      frontendBaseUrl: "https://requirements.example/app/",
      from: "requirements@example.org",
      host: "smtp.example.org",
      password: SMTP_CREDENTIAL,
      port: 465,
      secure: true,
      username: "smtp-user",
    });
  });

  it("rejects incomplete or malformed production configuration.", () => {
    configureProductionEnvironment();
    vi.stubEnv("SMTP_HOST", "");

    expect(loadMailConfiguration).toThrow(
      'Required environment variable "SMTP_HOST" is not defined',
    );

    vi.stubEnv("SMTP_HOST", "smtp.example.org");
    vi.stubEnv("SMTP_PORT", "not-a-port");
    expect(loadMailConfiguration).toThrow(
      'SMTP_PORT must be a valid TCP port, but received "not-a-port"',
    );
  });
});
