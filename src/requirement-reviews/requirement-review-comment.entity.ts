import { Requirement } from '@/projects/requirements.entity';
import { RequirementReviewCommentCloseReason } from '@/requirement-reviews/requirement-review-comment-close-reason.enum';
import { RequirementReviewCommentStatus } from '@/requirement-reviews/requirement-review-comment-status.enum';
import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';

@Entity({ name: 'requirement_review_comments' })
@Index('IDX_requirement_review_comments_project_id', ['projectId'])
@Index('IDX_requirement_review_comments_requirement_id', ['requirementId'])
@Index('IDX_requirement_review_comments_status', ['status'])
@Check('CHK_requirement_review_comments_status', `"status" IN ('open', 'closed')`)
@Check('CHK_requirement_review_comments_created_revision_range', '"created_for_revision_number" > 0')
@Check(
    'CHK_requirement_review_comments_closed_revision_range',
    '"closed_in_revision_number" IS NULL OR "closed_in_revision_number" > 0',
)
@Check(
    'CHK_requirement_review_comments_close_reason',
    `"close_reason" IS NULL OR "close_reason" IN ('resolved', 'requirement_rejected')`,
)
export class RequirementReviewComment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'uuid', name: 'requirement_id' })
    requirementId!: string;

    @Column({ type: 'integer', name: 'created_for_revision_number' })
    createdForRevisionNumber!: number;

    @Column({ type: 'text' })
    text!: string;

    @Column({ type: 'varchar', length: 10, default: RequirementReviewCommentStatus.Open })
    status!: RequirementReviewCommentStatus;

    @Column({ type: 'varchar', length: 120 })
    author!: string;

    @Column({ type: 'varchar', length: 120, name: 'closed_by', nullable: true })
    closedBy!: string | null;

    @Column({ type: 'varchar', length: 40, name: 'close_reason', nullable: true })
    closeReason!: RequirementReviewCommentCloseReason | null;

    @Column({ type: 'integer', name: 'closed_in_revision_number', nullable: true })
    closedInRevisionNumber!: number | null;

    @Column({ type: 'timestamptz', name: 'closed_at', nullable: true })
    closedAt!: Date | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Requirement, (requirement) => requirement.reviewComments, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requirement_id' })
    requirement!: Relation<Requirement>;
}
