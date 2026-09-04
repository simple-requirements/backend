import { registerAs } from "@nestjs/config";

export interface MailConfiguration {
  disabled: boolean;
  frontendBaseUrl: string;
  from: string;
  host: string;
  password: string;
  port: number;
  secure: boolean;
  username: string;
}

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    throw new Error(`Required environment variable "${name}" is not defined`);
  }

  return value;
}

function mailDeliveryIsDisabled(): boolean {
  return process.env.NODE_ENV === "test";
}

function frontendBaseUrl(): string {
  const value =
    process.env.FRONTEND_BASE_URL ??
    (mailDeliveryIsDisabled()
      ? "http://localhost:5173"
      : requiredEnvironmentVariable("FRONTEND_BASE_URL"));
  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("FRONTEND_BASE_URL must be an absolute HTTP or HTTPS URL");
  }

  return url.toString();
}

function smtpPort(): number {
  if (mailDeliveryIsDisabled()) {
    return 587;
  }

  const value = requiredEnvironmentVariable("SMTP_PORT");
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `SMTP_PORT must be a valid TCP port, but received "${value}"`,
    );
  }

  return port;
}

export function loadMailConfiguration(): MailConfiguration {
  const disabled = mailDeliveryIsDisabled();

  return {
    disabled,
    frontendBaseUrl: frontendBaseUrl(),
    from: disabled
      ? "test@example.invalid"
      : requiredEnvironmentVariable("SMTP_FROM"),
    host: disabled ? "localhost" : requiredEnvironmentVariable("SMTP_HOST"),
    password: disabled ? "" : requiredEnvironmentVariable("SMTP_PASSWORD"),
    port: smtpPort(),
    secure: disabled ? false : process.env.SMTP_SECURE === "true",
    username: disabled ? "" : requiredEnvironmentVariable("SMTP_USER"),
  };
}

export default registerAs("mail", loadMailConfiguration);
