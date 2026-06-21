import { Project } from '@/projects/project.entity';
import { Requirement } from '@/requirements/requirements.entity';
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
} from 'typeorm';

export enum RequirementLinkRelationshipType {
    References = 'references',
}

@Entity({ name: 'requirement_links' })
@Index('IDX_requirement_links_project_id', ['projectId'])
@Index('IDX_requirement_links_source_requirement_id', ['sourceRequirementId'])
@Index('IDX_requirement_links_target_requirement_id', ['targetRequirementId'])
@Index(
    'UQ_requirement_links_active_source_target_type',
    ['sourceRequirementId', 'targetRequirementId', 'relationshipType'],
    { unique: true, where: 'deleted_at IS NULL' },
)
@Check('CHK_requirement_links_relationship_type', `"relationship_type" IN ('references')`)
@Check('CHK_requirement_links_no_self_link', '"source_requirement_id" <> "target_requirement_id"')
export class RequirementLink {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'uuid', name: 'source_requirement_id' })
    sourceRequirementId!: string;

    @Column({ type: 'uuid', name: 'target_requirement_id' })
    targetRequirementId!: string;

    @Column({
        type: 'varchar',
        length: 20,
        name: 'relationship_type',
        default: RequirementLinkRelationshipType.References,
    })
    relationshipType!: RequirementLinkRelationshipType;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
    deletedAt!: Date | null;

    @ManyToOne(() => Project, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'project_id' })
    project!: Project;

    @ManyToOne(() => Requirement, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'source_requirement_id' })
    sourceRequirement!: Requirement;

    @ManyToOne(() => Requirement, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'target_requirement_id' })
    targetRequirement!: Requirement;
}
