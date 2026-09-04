import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";

import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { User } from "@/auth/accounts/users.entity";

@Entity({ name: "global_user_roles" })
@Index("UQ_global_user_roles_user_role", ["userId", "role"], { unique: true })
@Check("CHK_global_user_roles_role", `"role" IN ('administrator')`)
export class GlobalUserRole {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 32 })
  role!: GlobalRole;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user!: Relation<User>;
}
