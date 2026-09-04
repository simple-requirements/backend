import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "login_attempts" })
@Index("IDX_login_attempts_source_username_created", [
  "sourceHash",
  "usernameHash",
  "createdAt",
])
export class LoginAttempt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 64, name: "source_hash" })
  sourceHash!: string;

  @Column({ type: "char", length: 64, name: "username_hash" })
  usernameHash!: string;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
}
