import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  type Relation,
} from "typeorm";

import { User } from "@/auth/accounts/users.entity";

export const AUTHENTICATION_BOOTSTRAP_ID = 1;

@Entity({ name: "authentication_bootstrap" })
@Check("CHK_authentication_bootstrap_singleton", `"id" = 1`)
export class AuthenticationBootstrap {
  @PrimaryColumn({ type: "smallint" })
  id!: number;

  @Column({ type: "uuid", name: "administrator_user_id", unique: true })
  administratorUserId!: string;

  @Column({ type: "timestamptz", name: "completed_at" })
  completedAt!: Date;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @OneToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "administrator_user_id" })
  administrator!: Relation<User>;
}
