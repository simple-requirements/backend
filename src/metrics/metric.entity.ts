import { Project } from '@/projects/project.entity';
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

@Entity({ name: 'metrics' })
@Index('UQ_metrics_project_key', ['projectId', 'key'], { unique: true })
@Index('IDX_metrics_project_id', ['projectId'])
@Check('CHK_metrics_key_format', `"key" ~ '^MET-[0-9]{4}$'`)
@Check('CHK_metrics_value_not_blank', `btrim("value") <> ''`)
export class Metric {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'varchar', length: 8 })
    key!: string;

    @Column({ type: 'text' })
    value!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Project, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'project_id' })
    project!: Project;
}
