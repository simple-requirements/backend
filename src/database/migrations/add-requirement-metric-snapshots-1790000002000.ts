import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export class AddRequirementMetricSnapshots1790000002000 implements MigrationInterface {
    name = 'AddRequirementMetricSnapshots1790000002000';

    async up(queryRunner: QueryRunner): Promise<void> {
        const column = new TableColumn({
            name: 'metric_snapshots',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'::jsonb",
        });
        await queryRunner.addColumn('requirements', column);
        await queryRunner.addColumn(
            'requirement_revisions',
            new TableColumn({ name: 'metric_snapshots', type: 'jsonb', isNullable: false, default: "'[]'::jsonb" }),
        );

        await queryRunner.query(`
            UPDATE "requirements" requirement
            SET "metric_snapshots" = COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'metricId', metric."id",
                        'key', metric."key",
                        'value', metric."value"
                    )
                    ORDER BY metric."key"
                )
                FROM "metrics" metric
                WHERE metric."project_id" = requirement."project_id"
                  AND requirement."description" IS NOT NULL
                  AND requirement."description" LIKE '%[~' || metric."key" || ']%'
            ), '[]'::jsonb)
        `);

        await queryRunner.query(`
            UPDATE "requirement_revisions" revision
            SET "metric_snapshots" = COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'metricId', metric."id",
                        'key', metric."key",
                        'value', metric."value"
                    )
                    ORDER BY metric."key"
                )
                FROM "metrics" metric
                WHERE metric."project_id" = revision."project_id"
                  AND revision."description" IS NOT NULL
                  AND revision."description" LIKE '%[~' || metric."key" || ']%'
            ), '[]'::jsonb)
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('requirement_revisions', 'metric_snapshots');
        await queryRunner.dropColumn('requirements', 'metric_snapshots');
    }
}
