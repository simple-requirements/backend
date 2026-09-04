import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table } from "typeorm";

export class CreateAuthenticationSessions1720000000080 implements MigrationInterface {
  name = "CreateAuthenticationSessions1720000000080";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "authentication_sessions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "user_id", type: "uuid" },
          { name: "token_hash", type: "char", length: "64" },
          { name: "last_activity_at", type: "timestamptz" },
          { name: "revoked_at", type: "timestamptz", isNullable: true },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
        indices: [
          {
            name: "UQ_authentication_sessions_token_hash",
            columnNames: ["token_hash"],
            isUnique: true,
          },
          {
            name: "IDX_authentication_sessions_user_activity",
            columnNames: ["user_id", "last_activity_at"],
          },
        ],
        foreignKeys: [
          {
            name: "FK_authentication_sessions_user_id",
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
        name: "login_attempts",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "source_hash", type: "char", length: "64" },
          { name: "username_hash", type: "char", length: "64" },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
        indices: [
          {
            name: "IDX_login_attempts_source_username_created",
            columnNames: ["source_hash", "username_hash", "created_at"],
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("login_attempts", true);
    await queryRunner.dropTable("authentication_sessions", true);
  }
}
