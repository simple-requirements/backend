import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table } from "typeorm";

export class CreateRequirementsTable1720000000010 implements MigrationInterface {
  name = "CreateRequirementsTable1720000000010";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.createTable(
      new Table({
        name: "requirements",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "project_id", type: "uuid", isNullable: false },
          { name: "category_id", type: "uuid", isNullable: false },
          { name: "sequence_number", type: "integer", isNullable: false },
          { name: "key", type: "varchar", length: "13", isNullable: false },
          { name: "revision_number", type: "integer", isNullable: false },
          {
            name: "status",
            type: "varchar",
            length: "12",
            default: "'draft'",
            isNullable: false,
          },
          { name: "description", type: "text", isNullable: true },
          { name: "priority", type: "varchar", length: "5", isNullable: true },
          { name: "owner", type: "varchar", length: "120", isNullable: true },
          { name: "rationale", type: "text", isNullable: true },
          { name: "source", type: "text", isNullable: true },
          { name: "rejection_reason", type: "text", isNullable: true },
          {
            name: "reviewer",
            type: "varchar",
            length: "120",
            isNullable: true,
          },
          { name: "rejected_at", type: "timestamptz", isNullable: true },
          { name: "deleted_at", type: "timestamptz", isNullable: true },
          { name: "approved_at", type: "timestamptz", isNullable: true },
          { name: "implemented_at", type: "timestamptz", isNullable: true },
          { name: "obsolescence_reason", type: "text", isNullable: true },
          { name: "obsolete_at", type: "timestamptz", isNullable: true },
          {
            name: "obsoleted_by",
            type: "varchar",
            length: "120",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "now()",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "now()",
            isNullable: false,
          },
        ],
        indices: [
          { name: "IDX_requirements_project_id", columnNames: ["project_id"] },
          {
            name: "IDX_requirements_category_id",
            columnNames: ["category_id"],
          },
          { name: "IDX_requirements_deleted_at", columnNames: ["deleted_at"] },
        ],
        uniques: [
          {
            name: "UQ_requirements_project_key",
            columnNames: ["project_id", "key"],
          },
          {
            name: "UQ_requirements_category_sequence",
            columnNames: ["category_id", "sequence_number"],
          },
        ],
        checks: [
          {
            name: "CHK_requirements_status",
            expression: `"status" IN ('draft', 'approved', 'implemented', 'obsolete', 'rejected')`,
          },
          {
            name: "CHK_requirements_sequence_number_range",
            expression: '"sequence_number" > 0 AND "sequence_number" <= 9999',
          },
          {
            name: "CHK_requirements_revision_number_range",
            expression: '"revision_number" > 0',
          },
          {
            name: "CHK_requirements_priority",
            expression: `"priority" IS NULL OR "priority" IN ('p1', 'p2', 'p3')`,
          },
          {
            name: "CHK_requirements_key_format",
            expression: `"key" ~ '^(FR|NFR)-[A-Z]{2,4}-[0-9]{4}$'`,
          },
        ],
        foreignKeys: [
          {
            name: "FK_requirements_project_id_projects_id",
            columnNames: ["project_id"],
            referencedTableName: "projects",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            name: "FK_requirements_category_id_categories_id",
            columnNames: ["category_id"],
            referencedTableName: "categories",
            referencedColumnNames: ["id"],
            onDelete: "RESTRICT",
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("requirements", true);
  }
}
