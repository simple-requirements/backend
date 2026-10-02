import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableUnique } from 'typeorm';

export class CreateRequirementLinks1790000003000 implements MigrationInterface {
    name = 'CreateRequirementLinks1790000003000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createUniqueConstraint(
            'requirements',
            new TableUnique({ name: 'UQ_requirements_id_project_id', columnNames: ['id', 'project_id'] }),
        );

        await queryRunner.createTable(
            new Table({
                name: 'requirement_links',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
                    { name: 'project_id', type: 'uuid' },
                    { name: 'source_requirement_id', type: 'uuid' },
                    { name: 'target_requirement_id', type: 'uuid' },
                    { name: 'relationship_type', type: 'varchar', length: '16', default: "'references'" },
                    { name: 'created_at', type: 'timestamptz', default: 'now()' },
                    { name: 'updated_at', type: 'timestamptz', default: 'now()' },
                ],
                uniques: [
                    {
                        name: 'UQ_requirement_links_source_target',
                        columnNames: ['source_requirement_id', 'target_requirement_id'],
                    },
                ],
                indices: [
                    { name: 'IDX_requirement_links_project_id', columnNames: ['project_id'] },
                    { name: 'IDX_requirement_links_source_requirement_id', columnNames: ['source_requirement_id'] },
                    { name: 'IDX_requirement_links_target_requirement_id', columnNames: ['target_requirement_id'] },
                ],
                checks: [
                    {
                        name: 'CHK_requirement_links_relationship_type',
                        expression: `"relationship_type" = 'references'`,
                    },
                    {
                        name: 'CHK_requirement_links_not_self',
                        expression: '"source_requirement_id" <> "target_requirement_id"',
                    },
                ],
                foreignKeys: [
                    {
                        name: 'FK_requirement_links_project_id',
                        columnNames: ['project_id'],
                        referencedTableName: 'projects',
                        referencedColumnNames: ['id'],
                        onDelete: 'RESTRICT',
                    },
                    {
                        name: 'FK_requirement_links_source_requirement_project',
                        columnNames: ['source_requirement_id', 'project_id'],
                        referencedTableName: 'requirements',
                        referencedColumnNames: ['id', 'project_id'],
                        onDelete: 'RESTRICT',
                    },
                    {
                        name: 'FK_requirement_links_target_requirement_project',
                        columnNames: ['target_requirement_id', 'project_id'],
                        referencedTableName: 'requirements',
                        referencedColumnNames: ['id', 'project_id'],
                        onDelete: 'RESTRICT',
                    },
                ],
            }),
            true,
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('requirement_links', true);
        await queryRunner.dropUniqueConstraint('requirements', 'UQ_requirements_id_project_id');
    }
}
