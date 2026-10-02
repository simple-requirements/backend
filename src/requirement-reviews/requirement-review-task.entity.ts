import { User } from '@/auth/accounts/users.entity';
import { Project } from '@/projects/projects.entity';
import { Requirement } from '@/projects/requirements.entity';
import { RequirementReviewTaskStatus } from '@/requirement-reviews/requirement-review-task-status.enum';
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

@Entity({ name: 'requirement_review_tasks' })
@Index('IDX_requirement_review_tasks_project_id', ['projectId'])
@Index('IDX_requirement_review_tasks_requirement_id', ['requirementId'])
@Index('IDX_requirement_review_tasks_assignee_user_id', ['assigneeUserId'])
@Index('UQ_requirement_review_tasks_requirement_assignee', ['requirementId', 'assigneeUserId'], { unique: true })
@Check('CHK_requirement_review_tasks_status', `"status" IN ('pending', 'completed')`)
export class RequirementReviewTask {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'uuid', name: 'requirement_id' })
    requirementId!: string;

    @Column({ type: 'uuid', name: 'assignee_user_id' })
    assigneeUserId!: string;

    @Column({ type: 'uuid', name: 'assigned_by_user_id' })
    assignedByUserId!: string;

    @Column({ type: 'varchar', length: 12, default: RequirementReviewTaskStatus.Pending })
    status!: RequirementReviewTaskStatus;

    @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
    completedAt!: Date | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'project_id' })
    project!: Relation<Project>;

    @ManyToOne(() => Requirement, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requirement_id' })
    requirement!: Relation<Requirement>;

    @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'assignee_user_id' })
    assignee!: Relation<User>;

    @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'assigned_by_user_id' })
    assignedBy!: Relation<User>;
}
