import type { MigrationInterface, QueryRunner } from "typeorm";
import { TableColumn } from "typeorm";

function metadataColumns(): TableColumn[] {
  return [
    new TableColumn({
      name: "change_type",
      type: "varchar",
      length: "40",
      isNullable: false,
      default: "'content_changed'",
    }),
    new TableColumn({
      name: "change_reason",
      type: "text",
      isNullable: false,
      default: "'Legacy revision snapshot.'",
    }),
    new TableColumn({
      name: "changed_at",
      type: "timestamptz",
      isNullable: false,
      default: "now()",
    }),
    new TableColumn({
      name: "changed_by_user_id",
      type: "uuid",
      isNullable: true,
    }),
    new TableColumn({
      name: "changed_by_display_name",
      type: "varchar",
      length: "120",
      isNullable: false,
      default: "'System'",
    }),
  ];
}

export class AddRequirementRevisionMetadata1789210000000
  implements MigrationInterface
{
  name = "AddRequirementRevisionMetadata1789210000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ["requirements", "requirement_revisions"]) {
      for (const column of metadataColumns()) {
        await queryRunner.addColumn(tableName, column);
      }
    }

    await queryRunner.query(
      `UPDATE requirements
       SET change_type = CASE
             WHEN revision_number = 1 THEN 'requirement_created'
             ELSE 'content_changed'
           END,
           change_reason = CASE
             WHEN revision_number = 1 THEN 'Requirement created.'
             ELSE 'Legacy current revision.'
           END,
           changed_at = updated_at`,
    );

    await queryRunner.query(
      `UPDATE requirement_revisions
       SET changed_at = updated_at`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ["requirement_revisions", "requirements"]) {
      for (const columnName of [
        "changed_by_display_name",
        "changed_by_user_id",
        "changed_at",
        "change_reason",
        "change_type",
      ]) {
        await queryRunner.dropColumn(tableName, columnName);
      }
    }
  }
}
