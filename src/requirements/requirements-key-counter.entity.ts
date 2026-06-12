import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Category } from '@/categories/category.entity';
import { RequirementType } from '@/requirements/requirement-type-enum';

@Entity({ name: 'requirements_key_counters' })
@Index('UQ_requirements_key_counters_type_category', ['type', 'categoryId'], { unique: true })
@Check('CHK_requirements_key_counters_type', `"type" IN ('FR', 'NFR')`)
@Check('CHK_requirements_key_counters_next_number_range', '"next_number" > 0 AND "next_number" <= 10000')
export class RequirementsKeyCounter {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 3 })
    type!: RequirementType;

    @Column({ type: 'uuid', name: 'category_id' })
    categoryId!: string;

    @Column({ type: 'integer', name: 'next_number' })
    nextNumber!: number;

    @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'category_id' })
    category!: Category;
}
