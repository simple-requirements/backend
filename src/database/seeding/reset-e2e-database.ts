import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const RESET_TIMEOUT_MS = 30_000;

export async function resetE2eDatabase(): Promise<void> {
  await execFileAsync("pnpm", ["seed:demo"], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "test" },
    timeout: RESET_TIMEOUT_MS,
  });
}
