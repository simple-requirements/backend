import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

export class CreateProjectsTable1720000000000 implements MigrationInterface {
    name = 'CreateProjectsTable1720000000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        await queryRunner.createTable(
            new Table({
                name: 'projects',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    { name: 'name', type: 'varchar', length: '255', isNullable: false },
                    { name: 'created_at', type: 'timestamptz', default: 'now()', isNullable: false },
                    { name: 'updated_at', type: 'timestamptz', default: 'now()', isNullable: false },
                ],
            }),
            true,
        );

        await queryRunner.createIndex('projects', new TableIndex({ name: 'IDX_projects_name', columnNames: ['name'] }));
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('projects', 'IDX_projects_name');
        await queryRunner.dropTable('projects');
    }
}
