import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { Requirement } from '@/requirements/requirements.entity';
import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

/**
 * TypeORM entity storing immutable snapshots of requirement state before mutations.
 *
 * Revision numbers are unique per requirement and are created inside the same transaction as lifecycle or edit changes.
 */
@Entity({ name: 'requirements_revision' })
@Index('UQ_requirements_revisions_requirement_revision', ['requirementId', 'revisionNumber'], { unique: true })
@Check('CHK_requirements_revisions_type', `"type" IN ('FR', 'NFR')`)
@Check(
    'CHK_requirements_revisions_status',
    `"status" IN ('draft', 'approved', 'implemented', 'obsolete', 'rejected', 'deleted')`,
)
@Check('CHK_requirements_revisions_sequence_number_range', '"sequence_number" > 0 AND "sequence_number" <= 9999')
@Check('CHK_requirements_revisions_revision_number_range', '"revision_number" > 0')
@Check('CHK_requirements_revisions_visible_key_format', `"visible_key" ~ '^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$'`)
export class RequirementRevision {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'requirement_id' })
    requirementId!: string;

    @Column({ type: 'integer', name: 'revision_number' })
    revisionNumber!: number;

    @Column({ type: 'varchar', length: 13, name: 'visible_key' })
    visibleKey!: string;

    @Column({ type: 'varchar', length: 3 })
    type!: RequirementType;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'uuid', name: 'category_id' })
    categoryId!: string;

    @Column({ type: 'integer', name: 'sequence_number' })
    sequenceNumber!: number;

    @Column({ type: 'varchar', length: 10 })
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

    @Column({ type: 'timestamptz', name: 'rejected_at', nullable: true })
    rejectedAt!: Date | null;

    @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
    deletedAt!: Date | null;

    @Column({ type: 'timestamptz', name: 'approved_at', nullable: true })
    approvedAt!: Date | null;

    @Column({ type: 'timestamptz', name: 'implemented_at', nullable: true })
    implementedAt!: Date | null;

    @Column({ type: 'text', name: 'obsolescence_reason', nullable: true })
    obsolescenceReason!: string | null;

    @Column({ type: 'timestamptz', name: 'obsolete_at', nullable: true })
    obsoleteAt!: Date | null;

    @Column({ type: 'timestamptz', name: 'requirement_created_at' })
    requirementCreatedAt!: Date;

    @Column({ type: 'timestamptz', name: 'requirement_updated_at' })
    requirementUpdatedAt!: Date;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @ManyToOne(() => Requirement, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requirement_id' })
    requirement!: Requirement;
}
