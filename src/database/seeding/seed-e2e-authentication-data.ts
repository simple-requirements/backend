import { createHash } from 'node:crypto';

import { argon2id, hash as hashPassword } from 'argon2';
import type { DataSource, EntityManager } from 'typeorm';

import { ProjectRole } from '@/auth/authorization/project-role.enum';
import { AUTHENTICATION_BOOTSTRAP_ID } from '@/auth/bootstrap/authentication-bootstrap.entity';
import dataSource from '@/database/data-source';
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
} from '@/database/seeding/seed-e2e-authentication';
import { demoProjects } from '@/database/seeding/demo-projects';

type SeedUser = Readonly<{
    id: string;
    username: string;
    email: string;
    displayName: string;
    token: string;
    administrator?: boolean;
}>;


type DemoProjectMembership = Readonly<{
    projectId: string;
    userId: string;
    role: ProjectRole;
}>;

const SEEDED_MEMBER_USER_IDS = [
    E2E_ADMIN_USER_ID,
    E2E_REQUIREMENTS_ENGINEER_USER_ID,
    E2E_DEVELOPER_USER_ID,
    E2E_VIEWER_USER_ID,
] as const;

const DEMO_PROJECT_IDS = demoProjects.map(({ id }) => id);

const E2E_DEMO_PROJECT_MEMBERSHIPS: readonly DemoProjectMembership[] = demoProjects.flatMap(({ id }) => [
    { projectId: id, userId: E2E_ADMIN_USER_ID, role: ProjectRole.Viewer },
    { projectId: id, userId: E2E_REQUIREMENTS_ENGINEER_USER_ID, role: ProjectRole.RequirementsEngineer },
    { projectId: id, userId: E2E_DEVELOPER_USER_ID, role: ProjectRole.Developer },
    { projectId: id, userId: E2E_VIEWER_USER_ID, role: ProjectRole.Viewer },
]);

const E2E_USERS: readonly SeedUser[] = [
    {
        id: E2E_ADMIN_USER_ID,
        username: 'administrator',
        email: 'administrator@example.invalid',
        displayName: 'Administrator',
        token: E2E_ADMIN_ACCESS_TOKEN,
        administrator: true,
    },
    {
        id: E2E_REQUIREMENTS_ENGINEER_USER_ID,
        username: 'requirementsengineer',
        email: 'requirementsengineer@example.invalid',
        displayName: 'Requirements Engineer',
        token: E2E_REQUIREMENTS_ENGINEER_ACCESS_TOKEN,
    },
    {
        id: E2E_DEVELOPER_USER_ID,
        username: 'developer',
        email: 'developer@example.invalid',
        displayName: 'Developer',
        token: E2E_DEVELOPER_ACCESS_TOKEN,
    },
    {
        id: E2E_VIEWER_USER_ID,
        username: 'viewer',
        email: 'viewer@example.invalid',
        displayName: 'Viewer',
        token: E2E_VIEWER_ACCESS_TOKEN,
    },
];

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}


async function seedDemoProjectMemberships(manager: EntityManager): Promise<void> {
    await manager.query(
        `DELETE FROM project_memberships
         WHERE user_id = ANY($1::uuid[])
           AND project_id = ANY($2::uuid[])`,
        [SEEDED_MEMBER_USER_IDS, DEMO_PROJECT_IDS],
    );

    for (const membership of E2E_DEMO_PROJECT_MEMBERSHIPS) {
        await manager.query(
            `INSERT INTO project_memberships (project_id, user_id, role)
             SELECT $1, $2, $3
             WHERE EXISTS (SELECT 1 FROM projects WHERE id = $1)
             ON CONFLICT (project_id, user_id, role) DO NOTHING`,
            [membership.projectId, membership.userId, membership.role],
        );
    }
}

async function seedE2eAuthenticationWithManager(manager: EntityManager): Promise<void> {
    const passwordHash = await hashPassword(E2E_LOGIN_PASSWORD, {
        type: argon2id,
    });

    for (const user of E2E_USERS) {
        await manager.query(
            `INSERT INTO users
                 (id, username, normalized_username, email, normalized_email, display_name, password_hash, status, email_verified_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
             ON CONFLICT (id) DO UPDATE SET
                 username = EXCLUDED.username,
                 normalized_username = EXCLUDED.normalized_username,
                 email = EXCLUDED.email,
                 normalized_email = EXCLUDED.normalized_email,
                 display_name = EXCLUDED.display_name,
                 password_hash = EXCLUDED.password_hash,
                 status = 'active',
                 email_verified_at = COALESCE(users.email_verified_at, NOW()),
                 updated_at = NOW()`,
            [user.id, user.username, user.username, user.email, user.email, user.displayName, passwordHash],
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

    await manager.query(
        `INSERT INTO global_user_roles (user_id, role)
         VALUES ($1, 'administrator')
         ON CONFLICT (user_id, role) DO NOTHING`,
        [E2E_ADMIN_USER_ID],
    );

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

export async function seedE2eAuthenticationData(dataSourceInstance: DataSource): Promise<void> {
    if (dataSourceInstance.isInitialized) {
        await dataSourceInstance.transaction(seedE2eAuthenticationWithManager);
        return;
    }

    try {
        await dataSourceInstance.initialize();
        await dataSourceInstance.transaction(seedE2eAuthenticationWithManager);
    } finally {
        if (dataSourceInstance.isInitialized) {
            await dataSourceInstance.destroy();
        }
    }
}

async function main(): Promise<void> {
    await seedE2eAuthenticationData(dataSource);
}

if (require.main === module) {
    main().catch((error: unknown) => {
        console.error('Failed to seed E2E authentication data.');
        console.error(error);

        process.exitCode = 1;
    });
}
