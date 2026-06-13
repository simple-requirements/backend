import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Category } from '@/categories/category.entity';

/**
 * TypeORM entity containing durable visible-key counters per category.
 *
 * Rows are pessimistically locked during allocation so concurrent requests cannot receive duplicate sequence numbers.
 */
@Entity({ name: 'requirements_key_counters' })
@Index('UQ_requirements_key_counters_category', ['categoryId'], { unique: true })
@Check('CHK_requirements_key_counters_next_number_range', '"next_number" > 0 AND "next_number" <= 10000')
export class RequirementsKeyCounter {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'category_id' })
    categoryId!: string;

    @Column({ type: 'integer', name: 'next_number' })
    nextNumber!: number;

    @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'category_id' })
    category!: Category;
}
