import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class CreateRequirementReviewTasks1791000000000 implements MigrationInterface {
    name = 'CreateRequirementReviewTasks1791000000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
        await queryRunner.createTable(
            new Table({
                name: 'requirement_review_tasks',
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
                    { name: 'assignee_user_id', type: 'uuid', isNullable: false },
                    { name: 'assigned_by_user_id', type: 'uuid', isNullable: false },
                    { name: 'status', type: 'varchar', length: '12', default: "'pending'", isNullable: false },
                    { name: 'completed_at', type: 'timestamptz', isNullable: true },
                    { name: 'created_at', type: 'timestamptz', default: 'now()', isNullable: false },
                    { name: 'updated_at', type: 'timestamptz', default: 'now()', isNullable: false },
                ],
                indices: [
                    { name: 'IDX_requirement_review_tasks_project_id', columnNames: ['project_id'] },
                    { name: 'IDX_requirement_review_tasks_requirement_id', columnNames: ['requirement_id'] },
                    { name: 'IDX_requirement_review_tasks_assignee_user_id', columnNames: ['assignee_user_id'] },
                    {
                        name: 'UQ_requirement_review_tasks_requirement_assignee',
                        columnNames: ['requirement_id', 'assignee_user_id'],
                        isUnique: true,
                    },
                ],
                checks: [
                    { name: 'CHK_requirement_review_tasks_status', expression: `"status" IN ('pending', 'completed')` },
                ],
                foreignKeys: [
                    {
                        name: 'FK_review_tasks_project',
                        columnNames: ['project_id'],
                        referencedTableName: 'projects',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        name: 'FK_review_tasks_requirement',
                        columnNames: ['requirement_id'],
                        referencedTableName: 'requirements',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        name: 'FK_review_tasks_assignee',
                        columnNames: ['assignee_user_id'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'RESTRICT',
                    },
                    {
                        name: 'FK_review_tasks_assigned_by',
                        columnNames: ['assigned_by_user_id'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'RESTRICT',
                    },
                ],
            }),
            true,
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('requirement_review_tasks', true);
    }
}
