import { Project } from '@/projects/projects.entity';
import { RequirementType } from '@/requirements/requirement-type.enum';
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

/**
 * TypeORM entity for requirement categories.
 *
 * Category keys are uppercase database-backed segments used when allocating visible requirement keys.
 * Category names and keys are unique within a project.
 */
@Entity({ name: 'categories' })
@Index('IDX_categories_project_id', ['projectId'])
@Index('UQ_categories_project_name', ['projectId', 'name'], { unique: true })
@Index('UQ_categories_project_key', ['projectId', 'key'], { unique: true })
@Index('UQ_categories_id_type', ['id', 'type'], { unique: true })
@Check('CHK_categories_key_format', `"key" ~ '^[A-Z]{2,4}$'`)
@Check('CHK_categories_type', `"type" IN ('FR', 'NFR')`)
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'project_id' })
    projectId!: string;

    @Column({ type: 'varchar', length: 120 })
    name!: string;

    @Column({ type: 'varchar', length: 4 })
    key!: string;

    @Column({ type: 'varchar', length: 3 })
    type!: RequirementType;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Project, (project) => project.categories, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'project_id' })
    project!: Relation<Project>;
}
