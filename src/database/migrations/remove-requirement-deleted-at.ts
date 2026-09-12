import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn, TableIndex } from 'typeorm';

export class RemoveRequirementDeletedAt1789220000000 implements MigrationInterface {
    name = 'RemoveRequirementDeletedAt1789220000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await this.archiveLegacyDeletedRequirements(queryRunner);
        await this.convertLegacyDeletedRequirements(queryRunner);
        await queryRunner.dropIndex('requirements', 'IDX_requirements_deleted_at');
        await queryRunner.dropColumn('requirement_revisions', 'deleted_at');
        await queryRunner.dropColumn('requirements', 'deleted_at');
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'requirements',
            new TableColumn({ name: 'deleted_at', type: 'timestamptz', isNullable: true }),
        );
        await queryRunner.createIndex(
            'requirements',
            new TableIndex({ name: 'IDX_requirements_deleted_at', columnNames: ['deleted_at'] }),
        );
        await queryRunner.addColumn(
            'requirement_revisions',
            new TableColumn({ name: 'deleted_at', type: 'timestamptz', isNullable: true }),
        );
    }

    private async archiveLegacyDeletedRequirements(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO requirement_revisions (
                requirement_id,
                project_id,
                category_id,
                sequence_number,
                key,
                revision_number,
                change_type,
                change_reason,
                changed_at,
                changed_by_user_id,
                changed_by_display_name,
                status,
                description,
                priority,
                owner,
                rationale,
                source,
                rejection_reason,
                reviewer,
                obsoleted_by,
                implementation_tickets,
                rejected_at,
                deleted_at,
                approved_at,
                implemented_at,
                obsolescence_reason,
                obsolete_at,
                created_at,
                updated_at
            )
            SELECT
                requirement.id,
                requirement.project_id,
                requirement.category_id,
                requirement.sequence_number,
                requirement.key,
                requirement.revision_number,
                requirement.change_type,
                requirement.change_reason,
                requirement.changed_at,
                requirement.changed_by_user_id,
                requirement.changed_by_display_name,
                requirement.status,
                requirement.description,
                requirement.priority,
                requirement.owner,
                requirement.rationale,
                requirement.source,
                requirement.rejection_reason,
                requirement.reviewer,
                requirement.obsoleted_by,
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', ticket.id,
                                'ticketId', ticket.ticket_id,
                                'completedBy', ticket.completed_by,
                                'completedAt', ticket.completed_at
                            )
                            ORDER BY ticket.ticket_id
                        )
                        FROM requirement_implementation_tickets ticket
                        WHERE ticket.requirement_id = requirement.id
                    ),
                    '[]'::jsonb
                ),
                requirement.rejected_at,
                requirement.deleted_at,
                requirement.approved_at,
                requirement.implemented_at,
                requirement.obsolescence_reason,
                requirement.obsolete_at,
                requirement.created_at,
                requirement.updated_at
            FROM requirements requirement
            WHERE requirement.deleted_at IS NOT NULL
              AND requirement.status IN ('draft', 'approved', 'implemented')
            ON CONFLICT (requirement_id, revision_number) DO NOTHING
        `);
    }

    private async convertLegacyDeletedRequirements(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE requirements
            SET revision_number = revision_number + 1,
                status = CASE
                    WHEN status = 'draft' THEN 'rejected'
                    ELSE 'obsolete'
                END,
                change_type = CASE
                    WHEN status = 'draft' THEN 'rejected'
                    ELSE 'obsolete'
                END,
                change_reason = CASE
                    WHEN status = 'draft' THEN 'Legacy recycle-bin requirement retained as rejected.'
                    ELSE 'Legacy recycle-bin requirement retained as obsolete.'
                END,
                changed_at = deleted_at,
                changed_by_user_id = NULL,
                changed_by_display_name = 'System',
                rejection_reason = CASE
                    WHEN status = 'draft' THEN COALESCE(rejection_reason, 'Migrated from legacy recycle-bin state.')
                    ELSE rejection_reason
                END,
                reviewer = CASE
                    WHEN status = 'draft' THEN COALESCE(reviewer, 'System')
                    ELSE reviewer
                END,
                rejected_at = CASE
                    WHEN status = 'draft' THEN COALESCE(rejected_at, deleted_at)
                    ELSE rejected_at
                END,
                obsoleted_by = CASE
                    WHEN status IN ('approved', 'implemented') THEN COALESCE(obsoleted_by, 'System')
                    ELSE obsoleted_by
                END,
                obsolescence_reason = CASE
                    WHEN status IN ('approved', 'implemented') THEN COALESCE(obsolescence_reason, 'Migrated from legacy recycle-bin state.')
                    ELSE obsolescence_reason
                END,
                obsolete_at = CASE
                    WHEN status IN ('approved', 'implemented') THEN COALESCE(obsolete_at, deleted_at)
                    ELSE obsolete_at
                END,
                updated_at = GREATEST(updated_at, deleted_at)
            WHERE deleted_at IS NOT NULL
              AND status IN ('draft', 'approved', 'implemented')
        `);
    }
}
