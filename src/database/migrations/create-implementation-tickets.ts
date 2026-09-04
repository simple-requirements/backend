import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table } from "typeorm";

export class CreateImplementationTickets1720000000040 implements MigrationInterface {
  name = "CreateImplementationTickets1720000000040";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "requirement_implementation_tickets",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "requirement_id", type: "uuid" },
          { name: "ticket_id", type: "varchar", length: "120" },
          { name: "completed_by", type: "varchar", length: "120" },
          { name: "completed_at", type: "date" },
          { name: "created_at", type: "timestamptz", default: "now()" },
          { name: "updated_at", type: "timestamptz", default: "now()" },
        ],
        indices: [
          {
            name: "IDX_implementation_tickets_requirement_id",
            columnNames: ["requirement_id"],
          },
        ],
        uniques: [
          {
            name: "UQ_implementation_tickets_requirement_ticket_id",
            columnNames: ["requirement_id", "ticket_id"],
          },
        ],
        foreignKeys: [
          {
            name: "FK_implementation_tickets_requirement_id",
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
    await queryRunner.dropTable("requirement_implementation_tickets", true);
  }
}
