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

import { Category } from '@/categories/category.entity';
import { RequirementKind } from '@/requirements/requirement-kind.enum';

@Entity({ name: 'requirements' })
@Index('UQ_requirements_visible_key', ['visibleKey'], { unique: true })
@Index('UQ_requirements_kind_category_sequence', ['kind', 'categoryId', 'sequenceNumber'], { unique: true })
@Check('CHK_requirements_kind', `"kind" IN ('FR', 'NFR')`)
@Check('CHK_requirements_sequence_number_range', '"sequence_number" >= 0 AND "sequence_number" <= 9999')
@Check('CHK_requirements_visible_key_format', `"visible_key" ~ '^(FR|NFR)-[A-Z][A-Z0-9_]*-[0-9]{4}$'`)
export class Requirement {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 3 })
    kind!: RequirementKind;

    @Column({ type: 'uuid', name: 'category_id' })
    categoryId!: string;

    @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'category_id' })
    category!: Category;

    @Column({ type: 'integer', name: 'sequence_number' })
    sequenceNumber!: number;

    @Column({ type: 'varchar', length: 50, name: 'visible_key' })
    visibleKey!: string;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;
}
