import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
@Entity({ name: "password_reset_attempts" })
@Index("IDX_password_reset_attempts_source_created", [
  "sourceHash",
  "createdAt",
])
export class PasswordResetAttempt {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 64, name: "source_hash" })
  sourceHash!: string;
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
}
