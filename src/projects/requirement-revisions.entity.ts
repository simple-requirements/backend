import { Requirement } from '@/projects/requirements.entity';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';

@Entity({ name: 'requirement_revisions' })
@Index('IDX_requirement_revisions_requirement_id', ['requirementId'])
@Index('IDX_requirement_revisions_project_id', ['projectId'])
@Index('UQ_requirement_revisions_requirement_revision', ['requirementId', 'revisionNumber'], { unique: true })
@Check('CHK_requirement_revisions_status', `"status" IN ('draft', 'approved', 'implemented', 'obsolete', 'rejected')`)
@Check('CHK_requirement_revisions_sequence_number_range', '"sequence_number" > 0 AND "sequence_number" <= 9999')
@Check('CHK_requirement_revisions_revision_number_range', '"revision_number" > 0')
@Check('CHK_requirement_revisions_priority', `"priority" IS NULL OR "priority" IN ('p1', 'p2', 'p3')`)
@Check('CHK_requirement_revisions_key_format', `"key" ~ '^(FR|NFR)-[A-Z]{2,4}-[0-9]{4}$'`)
export class RequirementRevision {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'requirement_id' })
    requirementId!: string;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'uuid', name: 'category_id' })
    categoryId!: string;

    @Column({ type: 'integer', name: 'sequence_number' })
    sequenceNumber!: number;

    @Column({ type: 'varchar', length: 13, name: 'key' })
    visibleKey!: string;

    @Column({ type: 'integer', name: 'revision_number' })
    revisionNumber!: number;

    @Column({ type: 'varchar', length: 40, name: 'change_type', default: 'requirement_created' })
    changeType!: string;

    @Column({ type: 'text', name: 'change_reason', default: 'Requirement created' })
    changeReason!: string;

    @Column({ type: 'timestamptz', name: 'changed_at', default: () => 'now()' })
    changedAt!: Date;

    @Column({ type: 'uuid', name: 'changed_by_user_id', nullable: true })
    changedByUserId!: string | null;

    @Column({ type: 'varchar', length: 120, name: 'changed_by_display_name', default: 'System' })
    changedByDisplayName!: string;

    @Column({ type: 'varchar', length: 12 })
    status!: RequirementStatus;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', length: 5, nullable: true })
    priority!: string | null;

    @Column({ type: 'varchar', length: 120, nullable: true })
    owner!: string | null;

    @Column({ type: 'text', nullable: true })
    rationale!: string | null;

    @Column({ type: 'text', nullable: true })
    source!: string | null;

    @Column({ type: 'text', name: 'rejection_reason', nullable: true })
    rejectionReason!: string | null;

    @Column({ type: 'varchar', length: 120, nullable: true })
    reviewer!: string | null;

    @Column({
        type: 'varchar',
        length: 120,
        name: 'obsoleted_by',
        nullable: true,
    })
    obsoletedBy!: string | null;
    @Column({ type: 'jsonb', name: 'implementation_tickets', default: () => "'[]'::jsonb" })
    implementationTickets!: { id: string; ticketId: string; completedBy: string; completedAt: string }[];

    @Column({ type: 'timestamptz', name: 'rejected_at', nullable: true })
    rejectedAt!: Date | null;


    @Column({ type: 'timestamptz', name: 'approved_at', nullable: true })
    approvedAt!: Date | null;

    @Column({ type: 'timestamptz', name: 'implemented_at', nullable: true })
    implementedAt!: Date | null;

    @Column({ type: 'text', name: 'obsolescence_reason', nullable: true })
    obsolescenceReason!: string | null;

    @Column({ type: 'timestamptz', name: 'obsolete_at', nullable: true })
    obsoleteAt!: Date | null;

    @Column({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @Column({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Requirement, (requirement) => requirement.revisions, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'requirement_id' })
    requirement!: Relation<Requirement>;
}
