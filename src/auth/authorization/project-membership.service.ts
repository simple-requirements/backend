import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import type { ProjectMembershipResponseDto } from "@/auth/dto/project-membership-response.dto";
import type { AuthenticatedProjectMembershipDto } from "@/auth/dto/authenticated-project-membership.dto";
import { ProjectMembership } from "@/auth/authorization/project-membership.entity";
import type { ProjectRole } from "@/auth/authorization/project-role.enum";
import { User } from "@/auth/accounts/users.entity";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { Project } from "@/projects/projects.entity";

@Injectable()
export class ProjectMembershipService {
  constructor(private readonly dataSource: DataSource) {}

  async list(projectId: string): Promise<ProjectMembershipResponseDto[]> {
    await this.requireProject(projectId);
    const memberships = await this.dataSource
      .getRepository(ProjectMembership)
      .find({
        where: { projectId },
        relations: { user: true },
        order: { createdAt: "ASC" },
      });
    const byUser = new Map<string, ProjectMembershipResponseDto>();
    for (const membership of memberships) {
      const current = byUser.get(membership.userId) ?? {
        userId: membership.userId,
        username: membership.user.username,
        displayName: membership.user.displayName,
        roles: [],
      };
      current.roles.push(membership.role);
      byUser.set(membership.userId, current);
    }
    return [...byUser.values()];
  }

  async listForUser(
    userId: string,
  ): Promise<AuthenticatedProjectMembershipDto[]> {
    const memberships = await this.dataSource
      .getRepository(ProjectMembership)
      .find({ where: { userId }, order: { createdAt: "ASC" } });
    const byProject = new Map<string, AuthenticatedProjectMembershipDto>();
    for (const membership of memberships) {
      const current = byProject.get(membership.projectId) ?? {
        projectId: membership.projectId,
        roles: [],
      };
      current.roles.push(membership.role);
      byProject.set(membership.projectId, current);
    }
    return [...byProject.values()];
  }

  async projectIdsForUser(userId: string): Promise<string[]> {
    const memberships = await this.dataSource
      .getRepository(ProjectMembership)
      .findBy({ userId });
    return [...new Set(memberships.map(({ projectId }) => projectId))];
  }

  async set(
    projectId: string,
    userId: string,
    roles: ProjectRole[],
  ): Promise<ProjectMembershipResponseDto> {
    await this.requireProject(projectId);
    const user = await this.dataSource
      .getRepository(User)
      .findOneBy({ id: userId });
    if (user === null)
      throw new NotFoundException(`User with id "${userId}" was not found.`);
    if (user.status !== UserStatus.Active)
      throw new BadRequestException(
        "Only active users can receive project memberships.",
      );
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProjectMembership);
      await repository.delete({ projectId, userId });
      if (roles.length > 0)
        await repository.save(
          roles.map((role) => repository.create({ projectId, userId, role })),
        );
    });
    return {
      userId,
      username: user.username,
      displayName: user.displayName,
      roles,
    };
  }

  async remove(projectId: string, userId: string): Promise<void> {
    await this.requireProject(projectId);
    await this.dataSource
      .getRepository(ProjectMembership)
      .delete({ projectId, userId });
  }

  private async requireProject(projectId: string): Promise<void> {
    if (
      (await this.dataSource
        .getRepository(Project)
        .findOneBy({ id: projectId })) === null
    )
      throw new NotFoundException(
        `Project with id "${projectId}" was not found.`,
      );
  }
}
