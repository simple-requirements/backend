import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table } from "typeorm";

export class CreatePasswordReset1720000000091 implements MigrationInterface {
  name = "CreatePasswordReset1720000000091";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "password_reset_tokens",
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
          { name: "expires_at", type: "timestamptz" },
          { name: "consumed_at", type: "timestamptz", isNullable: true },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
        uniques: [
          {
            name: "UQ_password_reset_tokens_token_hash",
            columnNames: ["token_hash"],
          },
        ],
        foreignKeys: [
          {
            name: "FK_password_reset_tokens_user",
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
        name: "password_reset_attempts",
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
            name: "IDX_password_reset_attempts_source_created",
            columnNames: ["source_hash", "created_at"],
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("password_reset_attempts", true);
    await queryRunner.dropTable("password_reset_tokens", true);
  }
}
