import { registerAs } from "@nestjs/config";

export interface BootstrapConfiguration {
  secret: string | null;
}

function bootstrapSecret(): string | null {
  const value = process.env.INITIAL_ADMIN_BOOTSTRAP_SECRET;

  if (process.env.NODE_ENV === "test" && value === undefined) {
    return "test-only-bootstrap-secret-with-32-characters";
  }

  if (value === undefined) {
    return null;
  }

  if (value.length < 32) {
    throw new Error(
      "INITIAL_ADMIN_BOOTSTRAP_SECRET must contain at least 32 characters",
    );
  }

  return value;
}

export function loadBootstrapConfiguration(): BootstrapConfiguration {
  return { secret: bootstrapSecret() };
}

export default registerAs("bootstrap", loadBootstrapConfiguration);
