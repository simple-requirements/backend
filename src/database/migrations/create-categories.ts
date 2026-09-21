import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class CreateCategoriesTable1720000000005 implements MigrationInterface {
    name = 'CreateCategoriesTable1720000000005';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        await queryRunner.createTable(
            new Table({
                name: 'categories',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    { name: 'project_id', type: 'uuid', isNullable: false },
                    { name: 'name', type: 'varchar', length: '120', isNullable: false },
                    { name: 'key', type: 'varchar', length: '4', isNullable: false },
                    { name: 'type', type: 'varchar', length: '3', isNullable: false },
                    { name: 'created_at', type: 'timestamptz', default: 'now()', isNullable: false },
                    { name: 'updated_at', type: 'timestamptz', default: 'now()', isNullable: false },
                ],
                indices: [{ name: 'IDX_categories_project_id', columnNames: ['project_id'] }],
                uniques: [
                    { name: 'UQ_categories_project_name', columnNames: ['project_id', 'name'] },
                    { name: 'UQ_categories_project_key', columnNames: ['project_id', 'key'] },
                    { name: 'UQ_categories_id_type', columnNames: ['id', 'type'] },
                ],
                checks: [
                    { name: 'CHK_categories_key_format', expression: `"key" ~ '^[A-Z]{2,4}$'` },
                    { name: 'CHK_categories_type', expression: `"type" IN ('FR', 'NFR')` },
                ],
                foreignKeys: [
                    {
                        name: 'FK_categories_project_id_projects_id',
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
        await queryRunner.dropTable('categories', true);
    }
}
