import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table } from "typeorm";

export class CreateUsers1720000000050 implements MigrationInterface {
  name = "CreateUsers1720000000050";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "username", type: "varchar", length: "64" },
          {
            name: "normalized_username",
            type: "varchar",
            length: "64",
            isUnique: true,
          },
          { name: "email", type: "varchar", length: "320" },
          {
            name: "normalized_email",
            type: "varchar",
            length: "320",
            isUnique: true,
          },
          { name: "display_name", type: "varchar", length: "120" },
          { name: "password_hash", type: "text" },
          {
            name: "status",
            type: "varchar",
            length: "16",
            default: "'pending'",
          },
          { name: "email_verified_at", type: "timestamptz", isNullable: true },
          { name: "created_at", type: "timestamptz", default: "now()" },
          { name: "updated_at", type: "timestamptz", default: "now()" },
        ],
        checks: [
          {
            name: "CHK_users_status",
            expression: `"status" IN ('pending', 'active', 'deactivated')`,
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("users", true);
  }
}
