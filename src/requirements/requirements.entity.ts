import { Category } from '@/categories/category.entity';
import { RequirementType } from '@/requirements/requirement-type-enum';
import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'requirements' })
@Index('UQ_requirements_visible_key', ['visibleKey'], { unique: true })
@Index('UQ_requirements_type_category_sequence', ['type', 'categoryId', 'sequenceNumber'], { unique: true })
@Check('CHK_requirements_type', `"type" IN ('FR', 'NFR')`)
@Check('CHK_requirements_sequence_number_range', '"sequence_number" > 0 AND "sequence_number" <= 9999')
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

    @Column({ type: 'varchar', length: 10, name: 'visible_key' })
    visibleKey!: string;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @ManyToMany(() => Category, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'category_id' })
    category!: Category;
}
