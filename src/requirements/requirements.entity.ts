import { Category } from '@/categories/category.entity';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
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

/**
 * TypeORM entity representing the current state of a requirement.
 *
 * Visible keys and type/category sequence numbers are unique and remain reserved even after soft deletion or rejection.
 */
@Entity({ name: 'requirements' })
@Index('UQ_requirements_visible_key', ['visibleKey'], { unique: true })
@Index('UQ_requirements_type_category_sequence', ['type', 'categoryId', 'sequenceNumber'], { unique: true })
@Check('CHK_requirements_type', `"type" IN ('FR', 'NFR')`)
@Check('CHK_requirements_status', `"status" IN ('draft', 'approved', 'implemented', 'obsolete', 'rejected', 'deleted')`)
@Check('CHK_requirements_sequence_number_range', '"sequence_number" > 0 AND "sequence_number" <= 9999')
@Check('CHK_requirements_priority', `"priority" IN ('p1', 'p2', 'p3')`)
@Check('CHK_requirements_visible_key_format', `"visible_key" ~ '/^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$/gm'`)
export class Requirement {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 3 })
    type!: RequirementType;

    @Column({ type: 'uuid', name: 'category_id' })
    categoryId!: string;

    @Column({ type: 'integer', name: 'sequence_number' })
    sequenceNumber!: number;

    @Column({ type: 'varchar', length: 13, name: 'visible_key' })
    visibleKey!: string;

    @Column({ type: 'varchar', length: 10, default: RequirementStatus.Draft })
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
    category!: Category;
}
