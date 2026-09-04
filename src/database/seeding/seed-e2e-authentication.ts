import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const E2E_USER_ID = "10000000-0000-4000-8000-000000000001";

const execFileAsync = promisify(execFile);

const SEED_TIMEOUT_MS = 30_000;

export async function seedE2eAuthentication(): Promise<void> {
  await execFileAsync("pnpm", ["seed:e2e-authentication"], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "test" },
    timeout: SEED_TIMEOUT_MS,
  });
}
