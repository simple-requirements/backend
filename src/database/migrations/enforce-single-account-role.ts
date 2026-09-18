import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSingleAccountRole1789300000000 implements MigrationInterface {
    name = 'EnforceSingleAccountRole1789300000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE users ADD COLUMN role varchar(32) NULL`);
        await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT "CHK_users_role"
      CHECK (role IS NULL OR role IN ('administrator', 'requirements_engineer', 'developer', 'viewer'))
    `);

        await queryRunner.query(`
      UPDATE users AS account
      SET role = 'administrator'
      WHERE EXISTS (
        SELECT 1
        FROM global_user_roles AS global_role
        WHERE global_role.user_id = account.id
          AND global_role.role = 'administrator'
      )
    `);

        await queryRunner.query(`
      DELETE FROM project_memberships AS membership
      USING users AS account
      WHERE membership.user_id = account.id
        AND account.role = 'administrator'
    `);

        await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT membership.user_id
          FROM project_memberships AS membership
          GROUP BY membership.user_id
          HAVING COUNT(DISTINCT membership.role) > 1
        ) THEN
          RAISE EXCEPTION 'Cannot migrate accounts with different project roles. Split those identities into separate accounts before running this migration.';
        END IF;
      END
      $$
    `);

        await queryRunner.query(`
      UPDATE users AS account
      SET role = membership_role.role
      FROM (
        SELECT user_id, MIN(role) AS role
        FROM project_memberships
        GROUP BY user_id
      ) AS membership_role
      WHERE account.id = membership_role.user_id
        AND account.role IS NULL
    `);

        // Legacy active/deactivated accounts without memberships had no role in the
        // old model. Preserve their lack of project access with the least-privileged
        // project role; Administrators can later grant memberships as appropriate.
        await queryRunner.query(`
      UPDATE users
      SET role = 'viewer'
      WHERE role IS NULL
        AND status IN ('active', 'deactivated')
    `);

        await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT "CHK_users_active_role"
      CHECK (status <> 'active' OR role IS NOT NULL)
    `);

        await queryRunner.query(`
      ALTER TABLE project_memberships
      DROP CONSTRAINT "UQ_project_memberships_project_user_role"
    `);
        await queryRunner.query(`ALTER TABLE project_memberships DROP COLUMN role`);
        await queryRunner.query(`
      ALTER TABLE project_memberships
      ADD CONSTRAINT "UQ_project_memberships_project_user"
      UNIQUE (project_id, user_id)
    `);

        await queryRunner.query(`DROP TABLE global_user_roles`);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TABLE global_user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        role varchar(32) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_global_user_roles_user_role" UNIQUE (user_id, role),
        CONSTRAINT "CHK_global_user_roles_role" CHECK (role IN ('administrator')),
        CONSTRAINT "FK_global_user_roles_user_id"
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      INSERT INTO global_user_roles (user_id, role)
      SELECT id, 'administrator'
      FROM users
      WHERE role = 'administrator'
    `);

        await queryRunner.query(`
      ALTER TABLE project_memberships
      DROP CONSTRAINT "UQ_project_memberships_project_user"
    `);
        await queryRunner.query(`ALTER TABLE project_memberships ADD COLUMN role varchar(32) NULL`);
        await queryRunner.query(`
      UPDATE project_memberships AS membership
      SET role = account.role
      FROM users AS account
      WHERE account.id = membership.user_id
    `);
        await queryRunner.query(`ALTER TABLE project_memberships ALTER COLUMN role SET NOT NULL`);
        await queryRunner.query(`
      ALTER TABLE project_memberships
      ADD CONSTRAINT "CHK_project_memberships_role"
      CHECK (role IN ('requirements_engineer', 'developer', 'viewer'))
    `);
        await queryRunner.query(`
      ALTER TABLE project_memberships
      ADD CONSTRAINT "UQ_project_memberships_project_user_role"
      UNIQUE (project_id, user_id, role)
    `);

        await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT "CHK_users_active_role"`);
        await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT "CHK_users_role"`);
        await queryRunner.query(`ALTER TABLE users DROP COLUMN role`);
    }
}
