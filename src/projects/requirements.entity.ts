import { Category } from '@/projects/categories.entity';
import { Project } from '@/projects/projects.entity';
import { RequirementRevision } from '@/projects/requirement-revisions.entity';
import { RequirementImplementationTicket } from '@/projects/requirement-implementation-ticket.entity';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import { RequirementReviewComment } from '@/requirement-reviews/requirement-review-comment.entity';
import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';

@Entity({ name: 'requirements' })
@Index('IDX_requirements_project_id', ['projectId'])
@Index('IDX_requirements_category_id', ['categoryId'])
@Index('IDX_requirements_deleted_at', ['deletedAt'])
@Index('UQ_requirements_project_key', ['projectId', 'visibleKey'], {
    unique: true,
})
@Index('UQ_requirements_category_sequence', ['categoryId', 'sequenceNumber'], {
    unique: true,
})
@Check('CHK_requirements_status', `"status" IN ('draft', 'approved', 'implemented', 'obsolete', 'rejected')`)
@Check('CHK_requirements_sequence_number_range', '"sequence_number" > 0 AND "sequence_number" <= 9999')
@Check('CHK_requirements_revision_number_range', '"revision_number" > 0')
@Check('CHK_requirements_priority', `"priority" IS NULL OR "priority" IN ('p1', 'p2', 'p3')`)
@Check('CHK_requirements_key_format', `"key" ~ '^(FR|NFR)-[A-Z]{2,4}-[0-9]{4}$'`)
export class Requirement {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

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

    @Column({ type: 'varchar', length: 12, default: RequirementStatus.Draft })
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

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'category_id' })
    category!: Relation<Category>;

    @ManyToOne(() => Project, (project) => project.requirements, {
        nullable: false,
        onDelete: 'CASCADE',
        eager: true,
    })
    @JoinColumn({ name: 'project_id' })
    project!: Relation<Project>;

    @OneToMany(() => RequirementRevision, (revision) => revision.requirement)
    revisions!: Relation<RequirementRevision>[];

    @OneToMany(() => RequirementReviewComment, (comment) => comment.requirement)
    reviewComments!: Relation<RequirementReviewComment>[];
    @OneToMany(() => RequirementImplementationTicket, (ticket) => ticket.requirement, { eager: true })
    implementationTickets!: Relation<RequirementImplementationTicket>[];
}
