import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table } from "typeorm";

export class CreateAuthenticationBootstrap1720000000070 implements MigrationInterface {
  name = "CreateAuthenticationBootstrap1720000000070";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "global_user_roles",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "user_id", type: "uuid" },
          { name: "role", type: "varchar", length: "32" },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
        uniques: [
          {
            name: "UQ_global_user_roles_user_role",
            columnNames: ["user_id", "role"],
          },
        ],
        checks: [
          {
            name: "CHK_global_user_roles_role",
            expression: `"role" IN ('administrator')`,
          },
        ],
        foreignKeys: [
          {
            name: "FK_global_user_roles_user_id",
            columnNames: ["user_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "RESTRICT",
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: "authentication_bootstrap",
        columns: [
          { name: "id", type: "smallint", isPrimary: true },
          {
            name: "administrator_user_id",
            type: "uuid",
            isUnique: true,
          },
          { name: "completed_at", type: "timestamptz" },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
        checks: [
          {
            name: "CHK_authentication_bootstrap_singleton",
            expression: `"id" = 1`,
          },
        ],
        foreignKeys: [
          {
            name: "FK_authentication_bootstrap_administrator_user_id",
            columnNames: ["administrator_user_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "RESTRICT",
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: "bootstrap_registration_attempts",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "source_hash", type: "char", length: "64" },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
        indices: [
          {
            name: "IDX_bootstrap_registration_attempts_source_created",
            columnNames: ["source_hash", "created_at"],
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("bootstrap_registration_attempts", true);
    await queryRunner.dropTable("authentication_bootstrap", true);
    await queryRunner.dropTable("global_user_roles", true);
  }
}
