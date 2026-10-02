import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class CreateRequirementMetricReferences1790000001000 implements MigrationInterface {
    name = 'CreateRequirementMetricReferences1790000001000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'requirement_metric_references',
                columns: [
                    { name: 'requirement_id', type: 'uuid', isPrimary: true },
                    { name: 'metric_id', type: 'uuid', isPrimary: true },
                ],
                indices: [
                    { name: 'IDX_requirement_metric_references_requirement_id', columnNames: ['requirement_id'] },
                    { name: 'IDX_requirement_metric_references_metric_id', columnNames: ['metric_id'] },
                ],
                foreignKeys: [
                    {
                        name: 'FK_requirement_metric_references_requirement_id',
                        columnNames: ['requirement_id'],
                        referencedTableName: 'requirements',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        name: 'FK_requirement_metric_references_metric_id',
                        columnNames: ['metric_id'],
                        referencedTableName: 'metrics',
                        referencedColumnNames: ['id'],
                        onDelete: 'RESTRICT',
                    },
                ],
            }),
            true,
        );

        await queryRunner.query(`
            INSERT INTO "requirement_metric_references" ("requirement_id", "metric_id")
            SELECT DISTINCT requirement."id", metric."id"
            FROM "requirements" requirement
            INNER JOIN "metrics" metric
                ON metric."project_id" = requirement."project_id"
               AND requirement."description" LIKE '%[~' || metric."key" || ']%'
            WHERE requirement."description" IS NOT NULL
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('requirement_metric_references', true);
    }
}
