import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class CreateRequirementReviewCommentRepliesTable1720000000021 implements MigrationInterface {
    name = 'CreateRequirementReviewCommentRepliesTable1720000000021';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'requirement_review_comment_replies',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    { name: 'comment_id', type: 'uuid', isNullable: false },
                    { name: 'text', type: 'text', isNullable: false },
                    { name: 'author', type: 'varchar', length: '120', isNullable: false },
                    { name: 'created_at', type: 'timestamptz', default: 'now()', isNullable: false },
                ],
                indices: [{ name: 'IDX_requirement_review_comment_replies_comment_id', columnNames: ['comment_id'] }],
                foreignKeys: [
                    {
                        name: 'FK_requirement_review_comment_replies_comment_id',
                        columnNames: ['comment_id'],
                        referencedTableName: 'requirement_review_comments',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('requirement_review_comment_replies', true);
    }
}
