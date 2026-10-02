import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class CreateMetricsTable1790000000000 implements MigrationInterface {
    name = 'CreateMetricsTable1790000000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'metrics',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
                    { name: 'project_id', type: 'uuid', isNullable: false },
                    { name: 'key', type: 'varchar', length: '8', isNullable: false },
                    { name: 'value', type: 'text', isNullable: false },
                    { name: 'description', type: 'text', isNullable: false, default: "''" },
                    { name: 'active', type: 'boolean', isNullable: false, default: 'true' },
                    { name: 'created_at', type: 'timestamptz', default: 'now()', isNullable: false },
                    { name: 'updated_at', type: 'timestamptz', default: 'now()', isNullable: false },
                ],
                indices: [{ name: 'IDX_metrics_project_id', columnNames: ['project_id'] }],
                uniques: [{ name: 'UQ_metrics_project_key', columnNames: ['project_id', 'key'] }],
                checks: [
                    { name: 'CHK_metrics_key_format', expression: `"key" ~ '^MET-[0-9]{4}$'` },
                    { name: 'CHK_metrics_value_non_empty', expression: `length(btrim("value")) > 0` },
                ],
                foreignKeys: [
                    {
                        name: 'FK_metrics_project_id_projects_id',
                        columnNames: ['project_id'],
                        referencedTableName: 'projects',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('metrics', true);
    }
}
