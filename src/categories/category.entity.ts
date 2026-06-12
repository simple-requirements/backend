import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * TypeORM entity for requirement categories.
 *
 * Category keys are unique, uppercase database-backed segments used when allocating visible requirement keys.
 */
@Entity({ name: 'categories' })
@Index('UQ_categories_key', ['key'], { unique: true })
@Check('CHK_categories_key_format', `"key" ~ '^[A-Z][A-Z0-9_]*$'`)
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 120 })
    name!: string;

    @Column({ type: 'varchar', length: 40 })
    key!: string;
    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;
}
