import { createHash, randomUUID } from "node:crypto";

import type { APIRequestContext } from "@playwright/test";

import { DataSource } from "typeorm";

import { loadDatabaseConfiguration } from "@/database/database.config";
import { expect, test } from "@/projects/projects-api.e2e-fixtures";

const GENERIC_RESPONSE = { message: "Registration received." };
const GENERIC_RESEND_RESPONSE = {
  message: "If the account is eligible, a verification email will be sent.",
};
const BOOTSTRAP_RESPONSE = { message: "Bootstrap registration received." };
const TEST_BOOTSTRAP_SECRET =
  process.env.INITIAL_ADMIN_BOOTSTRAP_SECRET ??
  "test-only-bootstrap-secret-with-32-characters";

interface PersistedUserRow {
  emailVerifiedAt: Date | null;
  id: string;
  passwordHash: string;
  status: string;
}

const database = loadDatabaseConfiguration();
const inspectionDataSource = new DataSource({
  type: "postgres",
  host: database.host,
  port: database.port,
  database: database.database,
  username: database.username,
  password: database.password,
  entities: [],
  migrations: [],
  synchronize: false,
});

async function findPersistedUser(
  normalizedUsername: string,
): Promise<PersistedUserRow> {
  const result: unknown = await inspectionDataSource.query(
    `SELECT id, status, password_hash AS "passwordHash", email_verified_at AS "emailVerifiedAt"
       FROM users
      WHERE normalized_username = $1`,
    [normalizedUsername],
  );

  if (!Array.isArray(result) || result.length !== 1) {
    throw new Error(`Expected one persisted user for "${normalizedUsername}".`);
  }

  return result[0] as PersistedUserRow;
}

async function findVerificationTokens(userId: string): Promise<
  {
    consumedAt: Date | null;
    invalidatedAt: Date | null;
    tokenHash: string;
  }[]
> {
  const result: unknown = await inspectionDataSource.query(
    `SELECT token_hash AS "tokenHash", consumed_at AS "consumedAt",
            invalidated_at AS "invalidatedAt"
       FROM email_verification_tokens
      WHERE user_id = $1
      ORDER BY created_at ASC`,
    [userId],
  );

  if (!Array.isArray(result)) {
    throw new Error(`Could not read verification tokens for "${userId}".`);
  }

  return result as {
    consumedAt: Date | null;
    invalidatedAt: Date | null;
    tokenHash: string;
  }[];
}

async function insertVerificationToken(
  userId: string,
  plaintextToken: string,
): Promise<void> {
  const tokenHash = createHash("sha256").update(plaintextToken).digest("hex");

  await inspectionDataSource.query(
    `UPDATE email_verification_tokens
        SET invalidated_at = NOW()
      WHERE user_id = $1 AND consumed_at IS NULL AND invalidated_at IS NULL`,
    [userId],
  );
  await inspectionDataSource.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
    [userId, tokenHash],
  );
}

async function countPersistedUsers(
  normalizedUsername: string,
): Promise<number> {
  const result: unknown = await inspectionDataSource.query(
    `SELECT COUNT(*)::integer AS count
       FROM users
      WHERE normalized_username = $1`,
    [normalizedUsername],
  );

  if (!Array.isArray(result) || result.length !== 1) {
    throw new Error(`Could not count users for "${normalizedUsername}".`);
  }

  return (result[0] as { count: number }).count;
}

function createRegistration() {
  const uniqueValue = randomUUID();

  return {
    username: `user-${uniqueValue}`,
    email: `${uniqueValue}@example.org`,
    displayName: "Playwright User",
    password: "correct horse battery staple",
  };
}

async function countRows(tableName: string): Promise<number> {
  const allowedTables = new Set([
    "authentication_bootstrap",
    "global_user_roles",
  ]);

  if (!allowedTables.has(tableName)) {
    throw new Error(`Unsupported table "${tableName}".`);
  }

  const result: unknown = await inspectionDataSource.query(
    `SELECT COUNT(*)::integer AS count FROM ${tableName}`,
  );

  if (!Array.isArray(result) || result.length !== 1) {
    throw new Error(`Could not count rows in "${tableName}".`);
  }

  return (result[0] as { count: number }).count;
}

async function createActiveAdministrator(
  request: APIRequestContext,
): Promise<{ accessToken: string; userId: string }> {
  const registration = {
    ...createRegistration(),
    bootstrapSecret: TEST_BOOTSTRAP_SECRET,
  };
  expect(
    (
      await request.post("/auth/bootstrap/administrator", {
        data: registration,
      })
    ).status(),
  ).toBe(202);
  const user = await findPersistedUser(registration.username.toLowerCase());
  const verificationToken = `verification-${randomUUID()}`;
  await insertVerificationToken(user.id, verificationToken);
  expect(
    (
      await request.post("/auth/email-verification/confirm", {
        data: { token: verificationToken },
      })
    ).status(),
  ).toBe(204);
  const response = await request.post("/auth/login", {
    data: { username: registration.username, password: registration.password },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { accessToken: string };
  return { accessToken: body.accessToken, userId: user.id };
}

test.describe("Authentication API - POST /auth/register", () => {
  test.beforeAll(async () => {
    await inspectionDataSource.initialize();
  });

  test.afterAll(async () => {
    await inspectionDataSource.destroy();
  });

  test("accepts a valid pending registration without exposing account data.", async ({
    request,
  }) => {
    const registration = createRegistration();
    const response = await request.post("/auth/register", {
      data: registration,
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(202);
    expect(body).toEqual(GENERIC_RESPONSE);
    expect(JSON.stringify(body)).not.toContain("password");

    const persistedUser = await findPersistedUser(
      registration.username.toLowerCase(),
    );

    expect(persistedUser.status).toBe("pending");
    expect(persistedUser.emailVerifiedAt).toBeNull();
    expect(persistedUser.passwordHash).toMatch(/^\$argon2id\$/);
    expect(persistedUser.passwordHash).not.toContain(registration.password);
    const verificationTokens = await findVerificationTokens(persistedUser.id);
    expect(verificationTokens).toHaveLength(1);
    expect(verificationTokens[0]?.tokenHash).toMatch(/^[a-f\d]{64}$/);
    expect(JSON.stringify(body)).not.toContain(
      verificationTokens[0]?.tokenHash ?? "unavailable-hash",
    );
  });

  test("returns the generic response for duplicate username and email values regardless of casing.", async ({
    request,
  }) => {
    const registration = createRegistration();
    const firstResponse = await request.post("/auth/register", {
      data: registration,
    });
    const duplicateResponse = await request.post("/auth/register", {
      data: {
        ...registration,
        username: registration.username.toUpperCase(),
        email: registration.email.toUpperCase(),
      },
    });

    expect(firstResponse.status()).toBe(202);
    expect(duplicateResponse.status()).toBe(202);
    expect(await firstResponse.json()).toEqual(GENERIC_RESPONSE);
    expect(await duplicateResponse.json()).toEqual(GENERIC_RESPONSE);
    await expect(
      countPersistedUsers(registration.username.toLowerCase()),
    ).resolves.toBe(1);
  });

  test("rejects malformed public input.", async ({ request }) => {
    const response = await request.post("/auth/register", {
      data: { ...createRegistration(), password: "too short" },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      message: "Password must contain at least 15 characters.",
      error: "Bad Request",
    });
  });

  test("keeps exactly one account during concurrent duplicate registration.", async ({
    request,
  }) => {
    const registration = createRegistration();
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        request.post("/auth/register", { data: registration }),
      ),
    );

    expect(responses.map((response) => response.status())).toEqual([
      202, 202, 202, 202,
    ]);
    await expect(
      countPersistedUsers(registration.username.toLowerCase()),
    ).resolves.toBe(1);
  });
});

test.describe("Authentication API - email verification", () => {
  test.beforeAll(async () => {
    await inspectionDataSource.initialize();
  });

  test.afterAll(async () => {
    await inspectionDataSource.destroy();
  });

  test("confirms a token once while the account remains pending.", async ({
    request,
  }) => {
    const registration = createRegistration();
    await request.post("/auth/register", { data: registration });
    const user = await findPersistedUser(registration.username.toLowerCase());
    const plaintextToken = `verification-${randomUUID()}`;
    await insertVerificationToken(user.id, plaintextToken);

    const response = await request.post("/auth/email-verification/confirm", {
      data: { token: plaintextToken },
    });
    expect(response.status()).toBe(204);

    const verifiedUser = await findPersistedUser(
      registration.username.toLowerCase(),
    );
    expect(verifiedUser.status).toBe("pending");
    expect(verifiedUser.emailVerifiedAt).not.toBeNull();
    expect(
      (await findVerificationTokens(user.id)).at(-1)?.consumedAt,
    ).not.toBeNull();

    const reuseResponse = await request.post(
      "/auth/email-verification/confirm",
      { data: { token: plaintextToken } },
    );
    expect(reuseResponse.status()).toBe(400);
    expect(await reuseResponse.json()).toMatchObject({
      message: "The email verification link is invalid or has expired.",
    });
  });

  test("returns a generic response and rotates an eligible resend token.", async ({
    request,
  }) => {
    const registration = createRegistration();
    await request.post("/auth/register", { data: registration });
    const user = await findPersistedUser(registration.username.toLowerCase());
    await inspectionDataSource.query(
      `UPDATE email_verification_tokens
          SET created_at = NOW() - INTERVAL '2 minutes'
        WHERE user_id = $1`,
      [user.id],
    );

    const response = await request.post("/auth/email-verification/resend", {
      data: { username: registration.username },
    });
    expect(response.status()).toBe(202);
    expect(await response.json()).toEqual(GENERIC_RESEND_RESPONSE);
    const tokens = await findVerificationTokens(user.id);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]?.invalidatedAt).not.toBeNull();

    const unknownResponse = await request.post(
      "/auth/email-verification/resend",
      { data: { username: `unknown-${randomUUID()}` } },
    );
    expect(await unknownResponse.json()).toEqual(GENERIC_RESEND_RESPONSE);
  });
});

test.describe("Authentication API - initial Administrator bootstrap", () => {
  test.beforeAll(async () => {
    await inspectionDataSource.initialize();
  });

  test.afterAll(async () => {
    await inspectionDataSource.destroy();
  });

  test("registers, verifies, and permanently activates the first Administrator.", async ({
    request,
  }) => {
    const registration = createRegistration();
    const initialStatus = await request.get("/auth/bootstrap/status");
    expect(await initialStatus.json()).toEqual({ registrationAvailable: true });

    const response = await request.post("/auth/bootstrap/administrator", {
      data: {
        ...registration,
        bootstrapSecret: TEST_BOOTSTRAP_SECRET,
      },
    });
    expect(response.status()).toBe(202);
    expect(await response.json()).toEqual(BOOTSTRAP_RESPONSE);
    const user = await findPersistedUser(registration.username.toLowerCase());
    expect(user.status).toBe("pending");
    await expect(countRows("authentication_bootstrap")).resolves.toBe(1);
    await expect(countRows("global_user_roles")).resolves.toBe(1);

    const plaintextToken = `bootstrap-verification-${randomUUID()}`;
    await insertVerificationToken(user.id, plaintextToken);
    const verification = await request.post(
      "/auth/email-verification/confirm",
      { data: { token: plaintextToken } },
    );
    expect(verification.status()).toBe(204);
    const activeUser = await findPersistedUser(
      registration.username.toLowerCase(),
    );
    expect(activeUser.status).toBe("active");
    expect(activeUser.emailVerifiedAt).not.toBeNull();

    const completedStatus = await request.get("/auth/bootstrap/status");
    expect(await completedStatus.json()).toEqual({
      registrationAvailable: false,
    });
    await inspectionDataSource.query(
      `UPDATE users SET status = 'deactivated' WHERE id = $1`,
      [user.id],
    );
    const statusAfterDeactivation = await request.get("/auth/bootstrap/status");
    expect(await statusAfterDeactivation.json()).toEqual({
      registrationAvailable: false,
    });
  });

  test("rejects invalid secrets without creating partial bootstrap data.", async ({
    request,
  }) => {
    const response = await request.post("/auth/bootstrap/administrator", {
      data: { ...createRegistration(), bootstrapSecret: "incorrect" },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      message: "Bootstrap registration is not available.",
    });
    await expect(countRows("authentication_bootstrap")).resolves.toBe(0);
    await expect(countRows("global_user_roles")).resolves.toBe(0);
  });

  test("allows exactly one bootstrap result during concurrent attempts.", async ({
    request,
  }) => {
    const registrations = Array.from({ length: 4 }, () => ({
      ...createRegistration(),
      bootstrapSecret: TEST_BOOTSTRAP_SECRET,
    }));
    const responses = await Promise.all(
      registrations.map((registration) =>
        request.post("/auth/bootstrap/administrator", {
          data: registration,
          headers: { "x-forwarded-for": randomUUID() },
        }),
      ),
    );

    const responseStatuses = responses
      .map((response) => response.status())
      .toSorted((first, second) => first - second);

    expect(responseStatuses).toEqual([202, 409, 409, 409]);
    await expect(countRows("authentication_bootstrap")).resolves.toBe(1);
    await expect(countRows("global_user_roles")).resolves.toBe(1);
  });
});

test.describe("Authentication API - sessions and user administration", () => {
  test.beforeAll(async () => {
    await inspectionDataSource.initialize();
  });
  test.afterAll(async () => {
    await inspectionDataSource.destroy();
  });

  test("logs in with an opaque token, exposes the principal, and logs out.", async ({
    request,
  }) => {
    const administrator = await createActiveAdministrator(request);
    const rows = await inspectionDataSource.query<{ tokenHash: string }[]>(
      `SELECT token_hash AS "tokenHash" FROM authentication_sessions WHERE user_id = $1`,
      [administrator.userId],
    );
    expect(rows[0]?.tokenHash).toBe(
      createHash("sha256").update(administrator.accessToken).digest("hex"),
    );
    expect(rows[0]?.tokenHash).not.toBe(administrator.accessToken);

    const headers = { Authorization: `Bearer ${administrator.accessToken}` };
    const me = await request.get("/auth/me", { headers });
    expect(me.status()).toBe(200);
    expect(await me.json()).toMatchObject({
      id: administrator.userId,
      status: "active",
      globalRoles: ["administrator"],
      projectMemberships: [],
    });
    expect((await request.post("/auth/logout", { headers })).status()).toBe(
      204,
    );
    expect((await request.get("/auth/me", { headers })).status()).toBe(401);
  });

  test("lets an Administrator activate and deactivate a verified user and revokes that user's sessions.", async ({
    request,
  }) => {
    const administrator = await createActiveAdministrator(request);
    const headers = { Authorization: `Bearer ${administrator.accessToken}` };
    const registration = createRegistration();
    expect(
      (await request.post("/auth/register", { data: registration })).status(),
    ).toBe(202);
    const user = await findPersistedUser(registration.username.toLowerCase());
    await inspectionDataSource.query(
      `UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
      [user.id],
    );
    const activation = await request.patch(`/admin/users/${user.id}/status`, {
      headers,
      data: { status: "active" },
    });
    expect(activation.status()).toBe(200);
    const login = await request.post("/auth/login", {
      data: {
        username: registration.username,
        password: registration.password,
      },
    });
    expect(login.status()).toBe(200);
    const userToken = ((await login.json()) as { accessToken: string })
      .accessToken;
    expect(
      (
        await request.patch(`/admin/users/${user.id}/status`, {
          headers,
          data: { status: "deactivated" },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await request.get("/auth/me", {
          headers: { Authorization: `Bearer ${userToken}` },
        })
      ).status(),
    ).toBe(401);
  });

  test("lets an Administrator manage project memberships.", async ({
    request,
  }) => {
    const administrator = await createActiveAdministrator(request);
    const headers = { Authorization: `Bearer ${administrator.accessToken}` };
    const projectResponse = await request.post("/projects", {
      headers,
      data: { name: "Membership project" },
    });
    expect(projectResponse.status()).toBe(201);
    const project = (await projectResponse.json()) as { id: string };
    const registration = createRegistration();
    await request.post("/auth/register", { data: registration });
    const user = await findPersistedUser(registration.username.toLowerCase());
    await inspectionDataSource.query(
      `UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
      [user.id],
    );
    expect(
      (
        await request.patch(`/admin/users/${user.id}/status`, {
          headers,
          data: { status: "active" },
        })
      ).status(),
    ).toBe(200);
    const response = await request.put(
      `/admin/projects/${project.id}/memberships/${user.id}`,
      { headers, data: { roles: ["requirements_engineer", "developer"] } },
    );
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      userId: user.id,
      roles: ["requirements_engineer", "developer"],
    });
    const login = await request.post("/auth/login", {
      data: {
        username: registration.username,
        password: registration.password,
      },
    });
    const memberToken = ((await login.json()) as { accessToken: string })
      .accessToken;
    const memberMe = await request.get("/auth/me", {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(memberMe.status()).toBe(200);
    expect(await memberMe.json()).toMatchObject({
      id: user.id,
      projectMemberships: [
        {
          projectId: project.id,
          roles: expect.arrayContaining(["requirements_engineer", "developer"]),
        },
      ],
    });
    expect(
      (
        await request.get(`/projects/${project.id}`, {
          headers: { Authorization: `Bearer ${memberToken}` },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await request.post(`/projects/${project.id}/categories`, {
          headers,
          data: { name: "Forbidden", key: "AUTH", type: "fr" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.delete(
          `/admin/projects/${project.id}/memberships/${user.id}`,
          { headers },
        )
      ).status(),
    ).toBe(204);
    expect(
      (
        await request.get(`/projects/${project.id}`, {
          headers: { Authorization: `Bearer ${memberToken}` },
        })
      ).status(),
    ).toBe(403);
  });

  test("resets a verified account password once and revokes its sessions.", async ({
    request,
  }) => {
    const administrator = await createActiveAdministrator(request);
    const plaintextToken = `reset-${randomUUID()}`;
    const tokenHash = createHash("sha256").update(plaintextToken).digest("hex");
    await inspectionDataSource.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [administrator.userId, tokenHash],
    );
    const response = await request.post("/auth/password-reset/confirm", {
      data: {
        token: plaintextToken,
        password: "new correct horse battery staple",
      },
    });
    expect(response.status()).toBe(204);
    expect(
      (
        await request.get("/auth/me", {
          headers: { Authorization: `Bearer ${administrator.accessToken}` },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post("/auth/password-reset/confirm", {
          data: {
            token: plaintextToken,
            password: "another correct horse battery staple",
          },
        })
      ).status(),
    ).toBe(400);
  });
});
