import { createHash } from "node:crypto";

import dataSource from "@/database/data-source";
import { E2E_USER_ID } from "@/database/seeding/seed-e2e-authentication";

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    const tokenHash = createHash("sha256")
      .update("e2e-authentication-token")
      .digest("hex");

    await dataSource.query(
      `INSERT INTO users (id, username, normalized_username, email, normalized_email, display_name, password_hash, status, email_verified_at)
       VALUES ($1, 'e2e-admin', 'e2e-admin', 'e2e@example.invalid', 'e2e@example.invalid',
               'E2E Requirements Engineer', 'not-used-for-session-authentication', 'active', NOW())`,
      [E2E_USER_ID],
    );
    await dataSource.query(
      `INSERT INTO global_user_roles (user_id, role) VALUES ($1, 'administrator')`,
      [E2E_USER_ID],
    );
    await dataSource.query(
      `INSERT INTO authentication_sessions (user_id, token_hash, last_activity_at)
       VALUES ($1, $2, NOW())`,
      [E2E_USER_ID, tokenHash],
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to seed E2E authentication data.");
  console.error(error);

  process.exitCode = 1;
});
