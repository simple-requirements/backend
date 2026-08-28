import { Requirement } from '@/projects/requirements.entity';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, type Relation } from 'typeorm';

@Entity({ name: 'requirement_implementation_tickets' })
@Index('IDX_implementation_tickets_requirement_id', ['requirementId'])
@Index('UQ_implementation_tickets_requirement_ticket_id', ['requirementId', 'ticketId'], { unique: true })
export class RequirementImplementationTicket {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column({ type: 'uuid', name: 'requirement_id' })
    requirementId!: string;
    @Column({ type: 'varchar', length: 120, name: 'ticket_id' })
    ticketId!: string;
    @Column({ type: 'varchar', length: 120, name: 'completed_by' })
    completedBy!: string;
    @Column({ type: 'date', name: 'completed_at' })
    completedAt!: string;
    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;
    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;
    @ManyToOne(() => Requirement, (requirement) => requirement.implementationTickets, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requirement_id' })
    requirement!: Relation<Requirement>;
}
