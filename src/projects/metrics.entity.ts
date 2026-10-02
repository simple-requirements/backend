import { Project } from '@/projects/projects.entity';
import { Requirement } from '@/projects/requirements.entity';
import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';

@Entity({ name: 'metrics' })
@Index('IDX_metrics_project_id', ['projectId'])
@Index('UQ_metrics_project_key', ['projectId', 'key'], { unique: true })
@Check('CHK_metrics_key_format', `"key" ~ '^MET-[0-9]{4}$'`)
@Check('CHK_metrics_value_non_empty', `length(btrim("value")) > 0`)
export class Metric {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'varchar', length: 8 })
    key!: string;

    @Column({ type: 'text' })
    value!: string;

    @Column({ type: 'text', default: '' })
    description!: string;

    @Column({ type: 'boolean', default: true })
    active!: boolean;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Project, (project) => project.metrics, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'project_id' })
    project!: Relation<Project>;

    @ManyToMany(() => Requirement, (requirement) => requirement.metrics)
    requirements!: Relation<Requirement>[];
}
