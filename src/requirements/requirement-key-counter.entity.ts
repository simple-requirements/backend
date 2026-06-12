import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Category } from '@/categories/category.entity';
import { RequirementKind } from '@/requirements/requirement-kind.enum';

@Entity({ name: 'requirement_key_counters' })
@Index('UQ_requirement_key_counters_kind_category', ['kind', 'categoryId'], { unique: true })
@Check('CHK_requirement_key_counters_kind', `"kind" IN ('FR', 'NFR')`)
@Check('CHK_requirement_key_counters_next_number_range', '"next_number" >= 0 AND "next_number" <= 10000')
export class RequirementKeyCounter {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 3 })
    kind!: RequirementKind;

    @Column({ type: 'uuid', name: 'category_id' })
    categoryId!: string;

    @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'category_id' })
    category!: Category;

    @Column({ type: 'integer', name: 'next_number' })
    nextNumber!: number;
}
