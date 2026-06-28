import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProjectsTable1710000000000 implements MigrationInterface {
    name = 'CreateProjectsTable1710000000000';

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
                    { name: 'createdAt', type: 'timestamp with time zone', default: 'now()', isNullable: false },
                    { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()', isNullable: false },
                ],
                indices: [{ name: 'IDX_projects_name', columnNames: ['name'] }],
            }),
            true,
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('projects', true);
    }
}
