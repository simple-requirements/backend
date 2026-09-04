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

@Entity({ name: "authentication_sessions" })
@Index("UQ_authentication_sessions_token_hash", ["tokenHash"], {
  unique: true,
})
@Index("IDX_authentication_sessions_user_activity", [
  "userId",
  "lastActivityAt",
])
export class AuthenticationSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @Column({ type: "char", length: 64, name: "token_hash" })
  tokenHash!: string;

  @Column({ type: "timestamptz", name: "last_activity_at" })
  lastActivityAt!: Date;

  @Column({ type: "timestamptz", name: "revoked_at", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user!: Relation<User>;
}
