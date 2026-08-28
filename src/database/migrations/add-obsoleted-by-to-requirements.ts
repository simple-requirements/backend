import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export class AddObsoletedByToRequirements1720000000030 implements MigrationInterface {
    name = 'AddObsoletedByToRequirements1720000000030';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'requirements',
            new TableColumn({
                name: 'obsoleted_by',
                type: 'varchar',
                length: '120',
                isNullable: true,
            }),
        );
        await queryRunner.addColumn(
            'requirement_revisions',
            new TableColumn({
                name: 'obsoleted_by',
                type: 'varchar',
                length: '120',
                isNullable: true,
            }),
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('requirement_revisions', 'obsoleted_by');
        await queryRunner.dropColumn('requirements', 'obsoleted_by');
    }
}
