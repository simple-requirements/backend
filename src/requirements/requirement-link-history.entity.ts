import { Project } from '@/projects/project.entity';
import { RequirementLink, RequirementLinkRelationshipType } from '@/requirements/requirement-link.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum RequirementLinkHistoryEventType {
    Created = 'created',
    TargetChanged = 'target_changed',
    Deleted = 'deleted',
}

@Entity({ name: 'requirement_link_history' })
@Index('IDX_requirement_link_history_link_id', ['linkId'])
@Index('IDX_requirement_link_history_project_id', ['projectId'])
@Index('IDX_requirement_link_history_source_requirement_id', ['sourceRequirementId'])
@Index('IDX_requirement_link_history_old_target_requirement_id', ['oldTargetRequirementId'])
@Index('IDX_requirement_link_history_new_target_requirement_id', ['newTargetRequirementId'])
@Index('IDX_requirement_link_history_occurred_at', ['occurredAt'])
@Check('CHK_requirement_link_history_relationship_type', `"relationship_type" IN ('references')`)
@Check('CHK_requirement_link_history_event_type', `"event_type" IN ('created', 'target_changed', 'deleted')`)
export class RequirementLinkHistory {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'link_id' })
    linkId!: string;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'uuid', name: 'source_requirement_id' })
    sourceRequirementId!: string;

    @Column({ type: 'uuid', name: 'old_target_requirement_id', nullable: true })
    oldTargetRequirementId!: string | null;

    @Column({ type: 'uuid', name: 'new_target_requirement_id', nullable: true })
    newTargetRequirementId!: string | null;

    @Column({
        type: 'varchar',
        length: 20,
        name: 'relationship_type',
        default: RequirementLinkRelationshipType.References,
    })
    relationshipType!: RequirementLinkRelationshipType;

    @Column({ type: 'varchar', length: 32, name: 'event_type' })
    eventType!: RequirementLinkHistoryEventType;

    @Column({ type: 'timestamptz', name: 'occurred_at' })
    occurredAt!: Date;

    @Column({ type: 'varchar', length: 120, nullable: true })
    actor!: string | null;

    @Column({ type: 'text', nullable: true })
    reason!: string | null;

    @ManyToOne(() => RequirementLink, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'link_id' })
    link!: RequirementLink;

    @ManyToOne(() => Project, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'project_id' })
    project!: Project;

    @ManyToOne(() => Requirement, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'source_requirement_id' })
    sourceRequirement!: Requirement;

    @ManyToOne(() => Requirement, { nullable: true, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'old_target_requirement_id' })
    oldTargetRequirement!: Requirement | null;

    @ManyToOne(() => Requirement, { nullable: true, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'new_target_requirement_id' })
    newTargetRequirement!: Requirement | null;
}
