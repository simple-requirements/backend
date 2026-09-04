import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table } from "typeorm";

export class CreateRequirementRevisionsTable1720000000015 implements MigrationInterface {
  name = "CreateRequirementRevisionsTable1720000000015";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.createTable(
      new Table({
        name: "requirement_revisions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "requirement_id", type: "uuid", isNullable: false },
          { name: "project_id", type: "uuid", isNullable: false },
          { name: "category_id", type: "uuid", isNullable: false },
          { name: "sequence_number", type: "integer", isNullable: false },
          { name: "key", type: "varchar", length: "13", isNullable: false },
          { name: "revision_number", type: "integer", isNullable: false },
          { name: "status", type: "varchar", length: "12", isNullable: false },
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
            name: "implementation_tickets",
            type: "jsonb",
            default: "'[]'::jsonb",
          },
          { name: "created_at", type: "timestamptz", isNullable: false },
          { name: "updated_at", type: "timestamptz", isNullable: false },
        ],
        indices: [
          {
            name: "IDX_requirement_revisions_requirement_id",
            columnNames: ["requirement_id"],
          },
          {
            name: "IDX_requirement_revisions_project_id",
            columnNames: ["project_id"],
          },
        ],
        uniques: [
          {
            name: "UQ_requirement_revisions_requirement_revision",
            columnNames: ["requirement_id", "revision_number"],
          },
        ],
        checks: [
          {
            name: "CHK_requirement_revisions_status",
            expression: `"status" IN ('draft', 'approved', 'implemented', 'obsolete', 'rejected')`,
          },
          {
            name: "CHK_requirement_revisions_sequence_number_range",
            expression: '"sequence_number" > 0 AND "sequence_number" <= 9999',
          },
          {
            name: "CHK_requirement_revisions_revision_number_range",
            expression: '"revision_number" > 0',
          },
          {
            name: "CHK_requirement_revisions_priority",
            expression: `"priority" IS NULL OR "priority" IN ('p1', 'p2', 'p3')`,
          },
          {
            name: "CHK_requirement_revisions_key_format",
            expression: `"key" ~ '^(FR|NFR)-[A-Z]{2,4}-[0-9]{4}$'`,
          },
        ],
        foreignKeys: [
          {
            name: "FK_requirement_revisions_requirement_id_requirements_id",
            columnNames: ["requirement_id"],
            referencedTableName: "requirements",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("requirement_revisions", true);
  }
}
