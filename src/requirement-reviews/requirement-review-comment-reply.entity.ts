import { RequirementReviewComment } from '@/requirement-reviews/requirement-review-comment.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';

@Entity({ name: 'requirement_review_comment_replies' })
@Index('IDX_requirement_review_comment_replies_comment_id', ['commentId'])
export class RequirementReviewCommentReply {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'comment_id' })
    commentId!: string;

    @Column({ type: 'text' })
    text!: string;

    @Column({ type: 'varchar', length: 120 })
    author!: string;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @ManyToOne(() => RequirementReviewComment, (comment) => comment.replies, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'comment_id' })
    comment!: Relation<RequirementReviewComment>;
}
