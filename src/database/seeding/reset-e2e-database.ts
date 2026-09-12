import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const RESET_TIMEOUT_MS = 30_000;

export interface ResetE2eDatabaseOptions {
  includeAuthentication?: boolean;
}

export async function resetE2eDatabase(
  options: ResetE2eDatabaseOptions = {},
): Promise<void> {
  await execFileAsync("pnpm", ["seed:demo"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      E2E_SEED_AUTHENTICATION:
        options.includeAuthentication === false ? "false" : "true",
    },
    timeout: RESET_TIMEOUT_MS,
  });
}
