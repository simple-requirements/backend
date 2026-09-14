import { createHash } from "node:crypto";

import { argon2id, hash as hashPassword } from "argon2";
import type { DataSource, EntityManager } from "typeorm";

import { AccountRole } from "@/auth/accounts/account-role.enum";
import { AUTHENTICATION_BOOTSTRAP_ID } from "@/auth/bootstrap/authentication-bootstrap.entity";
import dataSource from "@/database/data-source";
import {
  E2E_ADMIN_ACCESS_TOKEN,
  E2E_ADMIN_USER_ID,
  E2E_DEVELOPER_ACCESS_TOKEN,
  E2E_DEVELOPER_USER_ID,
  E2E_LOGIN_PASSWORD,
  E2E_REQUIREMENTS_ENGINEER_ACCESS_TOKEN,
  E2E_REQUIREMENTS_ENGINEER_USER_ID,
  E2E_VIEWER_ACCESS_TOKEN,
  E2E_VIEWER_USER_ID,
} from "@/database/seeding/seed-e2e-authentication";
import { demoProjects } from "@/database/seeding/demo-projects";

type SeedUser = Readonly<{
  id: string;
  username: string;
  email: string;
  displayName: string;
  token: string;
  role: AccountRole;
}>;

type DemoProjectMembership = Readonly<{
  projectId: string;
  userId: string;
}>;

const SEEDED_MEMBER_USER_IDS = [
  E2E_REQUIREMENTS_ENGINEER_USER_ID,
  E2E_DEVELOPER_USER_ID,
  E2E_VIEWER_USER_ID,
] as const;

const DEMO_PROJECT_IDS = demoProjects.map(({ id }) => id);

const E2E_DEMO_PROJECT_MEMBERSHIPS: readonly DemoProjectMembership[] =
  demoProjects.flatMap(({ id }) => [
    { projectId: id, userId: E2E_REQUIREMENTS_ENGINEER_USER_ID },
    { projectId: id, userId: E2E_DEVELOPER_USER_ID },
    { projectId: id, userId: E2E_VIEWER_USER_ID },
  ]);

const E2E_USERS: readonly SeedUser[] = [
  {
    id: E2E_ADMIN_USER_ID,
    username: "administrator",
    email: "administrator@example.invalid",
    displayName: "Administrator",
    token: E2E_ADMIN_ACCESS_TOKEN,
    role: AccountRole.Administrator,
  },
  {
    id: E2E_REQUIREMENTS_ENGINEER_USER_ID,
    username: "requirementsengineer",
    email: "requirementsengineer@example.invalid",
    displayName: "Requirements Engineer",
    token: E2E_REQUIREMENTS_ENGINEER_ACCESS_TOKEN,
    role: AccountRole.RequirementsEngineer,
  },
  {
    id: E2E_DEVELOPER_USER_ID,
    username: "developer",
    email: "developer@example.invalid",
    displayName: "Developer",
    token: E2E_DEVELOPER_ACCESS_TOKEN,
    role: AccountRole.Developer,
  },
  {
    id: E2E_VIEWER_USER_ID,
    username: "viewer",
    email: "viewer@example.invalid",
    displayName: "Viewer",
    token: E2E_VIEWER_ACCESS_TOKEN,
    role: AccountRole.Viewer,
  },
];

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function seedDemoProjectMemberships(
  manager: EntityManager,
): Promise<void> {
  await manager.query(
    `DELETE FROM project_memberships
     WHERE user_id = ANY($1::uuid[])
       AND project_id = ANY($2::uuid[])`,
    [SEEDED_MEMBER_USER_IDS, DEMO_PROJECT_IDS],
  );

  for (const membership of E2E_DEMO_PROJECT_MEMBERSHIPS) {
    await manager.query(
      `INSERT INTO project_memberships (project_id, user_id)
       SELECT $1, $2
       WHERE EXISTS (SELECT 1 FROM projects WHERE id = $1)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [membership.projectId, membership.userId],
    );
  }
}

async function seedE2eAuthenticationWithManager(
  manager: EntityManager,
): Promise<void> {
  const passwordHash = await hashPassword(E2E_LOGIN_PASSWORD, {
    type: argon2id,
  });

  for (const user of E2E_USERS) {
    await manager.query(
      `INSERT INTO users
           (id, username, normalized_username, email, normalized_email, display_name, password_hash, status, role, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NOW())
       ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           normalized_username = EXCLUDED.normalized_username,
           email = EXCLUDED.email,
           normalized_email = EXCLUDED.normalized_email,
           display_name = EXCLUDED.display_name,
           password_hash = EXCLUDED.password_hash,
           status = 'active',
           role = EXCLUDED.role,
           email_verified_at = COALESCE(users.email_verified_at, NOW()),
           updated_at = NOW()`,
      [
        user.id,
        user.username,
        user.username,
        user.email,
        user.email,
        user.displayName,
        passwordHash,
        user.role,
      ],
    );

    await manager.query(
      `INSERT INTO authentication_sessions (user_id, token_hash, last_activity_at, revoked_at)
       VALUES ($1, $2, NOW(), NULL)
       ON CONFLICT (token_hash) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           last_activity_at = NOW(),
           revoked_at = NULL`,
      [user.id, sha256(user.token)],
    );
  }

  await seedDemoProjectMemberships(manager);

  await manager.query(
    `INSERT INTO authentication_bootstrap (id, administrator_user_id, completed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET
         administrator_user_id = EXCLUDED.administrator_user_id,
         completed_at = COALESCE(authentication_bootstrap.completed_at, EXCLUDED.completed_at)`,
    [AUTHENTICATION_BOOTSTRAP_ID, E2E_ADMIN_USER_ID],
  );
}

export async function seedE2eAuthenticationData(
  dataSourceInstance: DataSource,
): Promise<void> {
  if (dataSourceInstance.isInitialized) {
    await dataSourceInstance.transaction(seedE2eAuthenticationWithManager);
    return;
  }

  let initialized = false;
  try {
    await dataSourceInstance.initialize();
    initialized = true;
    await dataSourceInstance.transaction(seedE2eAuthenticationWithManager);
  } finally {
    if (initialized) {
      await dataSourceInstance.destroy();
    }
  }
}

async function main(): Promise<void> {
  await seedE2eAuthenticationData(dataSource);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error("Failed to seed E2E authentication data.");
    console.error(error);

    process.exitCode = 1;
  });
}
