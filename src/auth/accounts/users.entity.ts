import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { AccountRole } from '@/auth/accounts/account-role.enum';
import { UserStatus } from '@/auth/accounts/user-status.enum';

@Entity({ name: 'users' })
@Index('UQ_users_normalized_username', ['normalizedUsername'], { unique: true })
@Index('UQ_users_normalized_email', ['normalizedEmail'], { unique: true })
@Check('CHK_users_status', `"status" IN ('pending', 'active', 'deactivated')`)
@Check(
    'CHK_users_role',
    `"role" IS NULL OR "role" IN ('administrator', 'requirements_engineer', 'developer', 'viewer')`,
)
@Check('CHK_users_active_role', `"status" <> 'active' OR "role" IS NOT NULL`)
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 64 })
    username!: string;

    @Column({ type: 'varchar', length: 64, name: 'normalized_username' })
    normalizedUsername!: string;

    @Column({ type: 'varchar', length: 320 })
    email!: string;

    @Column({ type: 'varchar', length: 320, name: 'normalized_email' })
    normalizedEmail!: string;

    @Column({ type: 'varchar', length: 120, name: 'display_name' })
    displayName!: string;

    @Column({ type: 'text', name: 'password_hash' })
    passwordHash!: string;

    @Column({ type: 'varchar', length: 16, default: UserStatus.Pending })
    status!: UserStatus;

    @Column({ type: 'varchar', length: 32, nullable: true })
    role!: AccountRole | null;

    @Column({ type: 'timestamptz', name: 'email_verified_at', nullable: true })
    emailVerifiedAt!: Date | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt!: Date;
}
