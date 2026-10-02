import { Project } from '@/projects/projects.entity';
import { Requirement } from '@/projects/requirements.entity';
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

export const REQUIREMENT_LINK_RELATIONSHIP = 'references' as const;

@Entity({ name: 'requirement_links' })
@Index('IDX_requirement_links_project_id', ['projectId'])
@Index('IDX_requirement_links_source_requirement_id', ['sourceRequirementId'])
@Index('IDX_requirement_links_target_requirement_id', ['targetRequirementId'])
@Index('UQ_requirement_links_source_target', ['sourceRequirementId', 'targetRequirementId'], { unique: true })
@Check('CHK_requirement_links_relationship_type', `"relationship_type" = 'references'`)
@Check('CHK_requirement_links_not_self', '"source_requirement_id" <> "target_requirement_id"')
export class RequirementLink {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'uuid', name: 'source_requirement_id' })
    sourceRequirementId!: string;

    @Column({ type: 'uuid', name: 'target_requirement_id' })
    targetRequirementId!: string;

    @Column({ type: 'varchar', length: 16, name: 'relationship_type', default: REQUIREMENT_LINK_RELATIONSHIP })
    relationshipType!: typeof REQUIREMENT_LINK_RELATIONSHIP;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Project, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'project_id' })
    project!: Relation<Project>;

    @ManyToOne(() => Requirement, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn([
        { name: 'source_requirement_id', referencedColumnName: 'id' },
        { name: 'project_id', referencedColumnName: 'projectId' },
    ])
    sourceRequirement!: Relation<Requirement>;

    @ManyToOne(() => Requirement, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn([
        { name: 'target_requirement_id', referencedColumnName: 'id' },
        { name: 'project_id', referencedColumnName: 'projectId' },
    ])
    targetRequirement!: Relation<Requirement>;
}
