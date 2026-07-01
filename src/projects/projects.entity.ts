import { Category } from '@/categories/categories.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';

@Entity({ name: 'projects' })
@Index('IDX_projects_name', ['name'])
export class Project {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;

    @OneToMany(() => Category, (category) => category.project)
    categories!: Relation<Category>[];
}
