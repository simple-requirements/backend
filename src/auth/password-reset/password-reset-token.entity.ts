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

@Entity({ name: "password_reset_tokens" })
@Index("UQ_password_reset_tokens_token_hash", ["tokenHash"], { unique: true })
export class PasswordResetToken {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid", name: "user_id" }) userId!: string;
  @Column({ type: "char", length: 64, name: "token_hash" }) tokenHash!: string;
  @Column({ type: "timestamptz", name: "expires_at" }) expiresAt!: Date;
  @Column({ type: "timestamptz", name: "consumed_at", nullable: true })
  consumedAt!: Date | null;
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user!: Relation<User>;
}
