import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table } from "typeorm";

export class CreateProjectMemberships1720000000090 implements MigrationInterface {
  name = "CreateProjectMemberships1720000000090";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "project_memberships",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "project_id", type: "uuid" },
          { name: "user_id", type: "uuid" },
          { name: "role", type: "varchar", length: "32" },
          { name: "created_at", type: "timestamptz", default: "now()" },
        ],
        indices: [
          {
            name: "IDX_project_memberships_user_project",
            columnNames: ["user_id", "project_id"],
          },
        ],
        uniques: [
          {
            name: "UQ_project_memberships_project_user_role",
            columnNames: ["project_id", "user_id", "role"],
          },
        ],
        checks: [
          {
            name: "CHK_project_memberships_role",
            expression: `"role" IN ('requirements_engineer','developer','viewer')`,
          },
        ],
        foreignKeys: [
          {
            name: "FK_project_memberships_project",
            columnNames: ["project_id"],
            referencedTableName: "projects",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            name: "FK_project_memberships_user",
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
    await queryRunner.dropTable("project_memberships", true);
  }
}
