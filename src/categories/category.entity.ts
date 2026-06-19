import { RequirementType } from '@/requirements/requirement-type-enum';
import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * TypeORM entity for requirement categories.
 *
 * Category keys are unique, uppercase database-backed segments used when allocating visible requirement keys.
 */
@Entity({ name: 'categories' })
@Index('UQ_categories_key', ['key'], { unique: true })
@Index('UQ_categories_id_type', ['id', 'type'], { unique: true })
@Check('CHK_categories_key_format', `"key" ~ '^[A-Z]{2,4}$'`)
@Check('CHK_categories_type', `"type" IN ('FR', 'NFR')`)
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

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
}
