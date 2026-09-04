import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table } from "typeorm";

export class CreateEmailVerificationTokens1720000000060 implements MigrationInterface {
  name = "CreateEmailVerificationTokens1720000000060";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "email_verification_tokens",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "user_id", type: "uuid" },
          { name: "token_hash", type: "char", length: "64", isUnique: true },
          { name: "expires_at", type: "timestamptz" },
          { name: "consumed_at", type: "timestamptz", isNullable: true },
          { name: "invalidated_at", type: "timestamptz", isNullable: true },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
        indices: [
          {
            name: "IDX_email_verification_tokens_user_created",
            columnNames: ["user_id", "created_at"],
          },
        ],
        foreignKeys: [
          {
            name: "FK_email_verification_tokens_user_id",
            columnNames: ["user_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "RESTRICT",
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("email_verification_tokens", true);
  }
}
