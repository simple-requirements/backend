import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";

import { User } from "@/auth/accounts/users.entity";

@Entity({ name: "email_verification_tokens" })
@Index("UQ_email_verification_tokens_token_hash", ["tokenHash"], {
  unique: true,
})
@Index("IDX_email_verification_tokens_user_created", ["userId", "createdAt"])
export class EmailVerificationToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @Column({ type: "char", length: 64, name: "token_hash" })
  tokenHash!: string;

  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt!: Date;

  @Column({ type: "timestamptz", name: "consumed_at", nullable: true })
  consumedAt!: Date | null;

  @Column({ type: "timestamptz", name: "invalidated_at", nullable: true })
  invalidatedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user!: Relation<User>;
}
