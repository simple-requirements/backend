import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "bootstrap_registration_attempts" })
@Index("IDX_bootstrap_registration_attempts_source_created", [
  "sourceHash",
  "createdAt",
])
export class BootstrapRegistrationAttempt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 64, name: "source_hash" })
  sourceHash!: string;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
}
