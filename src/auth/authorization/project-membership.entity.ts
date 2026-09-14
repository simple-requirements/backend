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
import { Project } from "@/projects/projects.entity";

@Entity({ name: "project_memberships" })
@Index("UQ_project_memberships_project_user", ["projectId", "userId"], {
  unique: true,
})
export class ProjectMembership {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid", name: "project_id" }) projectId!: string;
  @Column({ type: "uuid", name: "user_id" }) userId!: string;
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project!: Relation<Project>;
  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user!: Relation<User>;
}
