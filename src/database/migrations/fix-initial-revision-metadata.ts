import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Corrects legacy archived revision 1 rows created before revision metadata distinguished requirement creation. */
export class FixInitialRevisionMetadata1789980000000 implements MigrationInterface {
    name = 'FixInitialRevisionMetadata1789980000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE requirement_revisions
             SET change_type = 'requirement_created',
                 change_reason = 'Requirement created.'
             WHERE revision_number = 1
               AND change_type = 'content_changed'
               AND change_reason = 'Legacy revision snapshot.'`,
        );
    }

    async down(): Promise<void> {
        // This data correction is intentionally not reverted because corrected rows are indistinguishable from
        // requirements that were created after revision metadata support was introduced.
    }
}
