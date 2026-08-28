import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableColumn } from 'typeorm';

export class AddImplementationTickets1720000000040 implements MigrationInterface {
    name = 'AddImplementationTickets1720000000040';
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('projects', new TableColumn({ name: 'ticket_url_template', type: 'text', isNullable: true }));
        await queryRunner.addColumn('requirement_revisions', new TableColumn({ name: 'implementation_tickets', type: 'jsonb', default: "'[]'::jsonb" }));
        await queryRunner.createTable(new Table({
            name: 'requirement_implementation_tickets',
            columns: [
                { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
                { name: 'requirement_id', type: 'uuid' },
                { name: 'ticket_id', type: 'varchar', length: '120' },
                { name: 'completed_by', type: 'varchar', length: '120' },
                { name: 'completed_at', type: 'date' },
                { name: 'created_at', type: 'timestamptz', default: 'now()' },
                { name: 'updated_at', type: 'timestamptz', default: 'now()' },
            ],
            indices: [{ name: 'IDX_implementation_tickets_requirement_id', columnNames: ['requirement_id'] }],
            uniques: [{ name: 'UQ_implementation_tickets_requirement_ticket_id', columnNames: ['requirement_id', 'ticket_id'] }],
            foreignKeys: [{ name: 'FK_implementation_tickets_requirement_id', columnNames: ['requirement_id'], referencedTableName: 'requirements', referencedColumnNames: ['id'], onDelete: 'CASCADE' }],
        }), true);
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('requirement_implementation_tickets', true);
        await queryRunner.dropColumn('requirement_revisions', 'implementation_tickets');
        await queryRunner.dropColumn('projects', 'ticket_url_template');
    }
}
