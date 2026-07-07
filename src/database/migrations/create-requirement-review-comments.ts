import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class CreateRequirementReviewCommentsTable1720000000020 implements MigrationInterface {
    name = 'CreateRequirementReviewCommentsTable1720000000020';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        await queryRunner.createTable(
            new Table({
                name: 'requirement_review_comments',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    { name: 'project_id', type: 'uuid', isNullable: false },
                    { name: 'requirement_id', type: 'uuid', isNullable: false },
                    { name: 'created_for_revision_number', type: 'integer', isNullable: false },
                    { name: 'text', type: 'text', isNullable: false },
                    { name: 'status', type: 'varchar', length: '10', default: "'open'", isNullable: false },
                    { name: 'author', type: 'varchar', length: '120', isNullable: false },
                    { name: 'closed_by', type: 'varchar', length: '120', isNullable: true },
                    { name: 'close_reason', type: 'varchar', length: '40', isNullable: true },
                    { name: 'closed_in_revision_number', type: 'integer', isNullable: true },
                    { name: 'closed_at', type: 'timestamptz', isNullable: true },
                    { name: 'created_at', type: 'timestamptz', default: 'now()', isNullable: false },
                    { name: 'updated_at', type: 'timestamptz', default: 'now()', isNullable: false },
                ],
                indices: [
                    { name: 'IDX_requirement_review_comments_project_id', columnNames: ['project_id'] },
                    { name: 'IDX_requirement_review_comments_requirement_id', columnNames: ['requirement_id'] },
                    { name: 'IDX_requirement_review_comments_status', columnNames: ['status'] },
                ],
                checks: [
                    {
                        name: 'CHK_requirement_review_comments_status',
                        expression: `"status" IN ('open', 'closed')`,
                    },
                    {
                        name: 'CHK_requirement_review_comments_created_revision_range',
                        expression: '"created_for_revision_number" > 0',
                    },
                    {
                        name: 'CHK_requirement_review_comments_closed_revision_range',
                        expression: '"closed_in_revision_number" IS NULL OR "closed_in_revision_number" > 0',
                    },
                    {
                        name: 'CHK_requirement_review_comments_close_reason',
                        expression: `"close_reason" IS NULL OR "close_reason" IN ('resolved', 'requirement_rejected')`,
                    },
                ],
                foreignKeys: [
                    {
                        name: 'FK_requirement_review_comments_project_id_projects_id',
                        columnNames: ['project_id'],
                        referencedTableName: 'projects',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        name: 'FK_requirement_review_comments_requirement_id_requirements_id',
                        columnNames: ['requirement_id'],
                        referencedTableName: 'requirements',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('requirement_review_comments', true);
    }
}
