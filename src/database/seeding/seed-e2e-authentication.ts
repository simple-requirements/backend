import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const E2E_ADMIN_USER_ID = '10000000-0000-4000-8000-000000000001';
export const E2E_REQUIREMENTS_ENGINEER_USER_ID = '10000000-0000-4000-8000-000000000002';
export const E2E_DEVELOPER_USER_ID = '10000000-0000-4000-8000-000000000003';
export const E2E_VIEWER_USER_ID = '10000000-0000-4000-8000-000000000004';

// Backwards-compatible alias used by older backend specs.
export const E2E_USER_ID = E2E_ADMIN_USER_ID;

export const E2E_ADMIN_ACCESS_TOKEN = 'e2e-authentication-token';
export const E2E_REQUIREMENTS_ENGINEER_ACCESS_TOKEN = 'e2e-requirements-engineer-token';
export const E2E_DEVELOPER_ACCESS_TOKEN = 'e2e-developer-token';
export const E2E_VIEWER_ACCESS_TOKEN = 'e2e-viewer-token';

export const E2E_LOGIN_USERNAME = 'administrator';
export const E2E_LOGIN_PASSWORD = 'password';

const execFileAsync = promisify(execFile);

const SEED_TIMEOUT_MS = 30_000;

function buildNodeOptions(): string {
    return [process.env.NODE_OPTIONS, '-r tsconfig-paths/register'].filter(Boolean).join(' ');
}

export async function seedE2eAuthentication(): Promise<void> {
    await execFileAsync('pnpm', ['exec', 'ts-node', 'src/database/seeding/seed-e2e-authentication-data.ts'], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test', NODE_OPTIONS: buildNodeOptions() },
        timeout: SEED_TIMEOUT_MS,
    });
}
