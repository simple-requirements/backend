import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { UserStatus } from "@/auth/accounts/user-status.enum";

@Entity({ name: "users" })
@Index("UQ_users_normalized_username", ["normalizedUsername"], { unique: true })
@Index("UQ_users_normalized_email", ["normalizedEmail"], { unique: true })
@Check("CHK_users_status", `"status" IN ('pending', 'active', 'deactivated')`)
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 64 })
  username!: string;

  @Column({ type: "varchar", length: 64, name: "normalized_username" })
  normalizedUsername!: string;

  @Column({ type: "varchar", length: 320 })
  email!: string;

  @Column({ type: "varchar", length: 320, name: "normalized_email" })
  normalizedEmail!: string;

  @Column({ type: "varchar", length: 120, name: "display_name" })
  displayName!: string;

  @Column({ type: "text", name: "password_hash" })
  passwordHash!: string;

  @Column({ type: "varchar", length: 16, default: UserStatus.Pending })
  status!: UserStatus;

  @Column({ type: "timestamptz", name: "email_verified_at", nullable: true })
  emailVerifiedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;
}
