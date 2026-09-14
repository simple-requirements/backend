import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";

import {
  AccountRole,
  isProjectAccountRole,
} from "@/auth/accounts/account-role.enum";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";
import { ProjectMembership } from "@/auth/authorization/project-membership.entity";
import type { AuthenticatedProjectMembershipDto } from "@/auth/dto/authenticated-project-membership.dto";
import type { ProjectMembershipResponseDto } from "@/auth/dto/project-membership-response.dto";
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

    return memberships.map((membership) => {
      const role = membership.user.role;
      if (!isProjectAccountRole(role)) {
        throw new BadRequestException(
          `User "${membership.userId}" does not have a project-scoped account role.`,
        );
      }
      return {
        userId: membership.userId,
        username: membership.user.username,
        displayName: membership.user.displayName,
        role,
      };
    });
  }

  async listForUser(
    userId: string,
  ): Promise<AuthenticatedProjectMembershipDto[]> {
    const memberships = await this.dataSource
      .getRepository(ProjectMembership)
      .find({ where: { userId }, order: { createdAt: "ASC" } });
    return memberships.map(({ projectId }) => ({ projectId }));
  }

  async projectIdsForUser(userId: string): Promise<string[]> {
    const memberships = await this.dataSource
      .getRepository(ProjectMembership)
      .findBy({ userId });
    return memberships.map(({ projectId }) => projectId);
  }

  async set(
    projectId: string,
    userId: string,
  ): Promise<ProjectMembershipResponseDto> {
    await this.requireProject(projectId);
    const user = await this.dataSource
      .getRepository(User)
      .findOneBy({ id: userId });
    if (user === null) {
      throw new NotFoundException(`User with id "${userId}" was not found.`);
    }
    if (user.status !== UserStatus.Active) {
      throw new BadRequestException(
        "Only active users can receive project memberships.",
      );
    }
    if (user.role === AccountRole.Administrator) {
      throw new BadRequestException(
        "Administrator accounts cannot receive project memberships.",
      );
    }
    if (!isProjectAccountRole(user.role)) {
      throw new BadRequestException(
        "The user must have a project-scoped account role before receiving project memberships.",
      );
    }

    const repository = this.dataSource.getRepository(ProjectMembership);
    const existing = await repository.findOneBy({ projectId, userId });
    if (existing === null) {
      await repository.save(repository.create({ projectId, userId }));
    }

    return {
      userId,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
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
    ) {
      throw new NotFoundException(
        `Project with id "${projectId}" was not found.`,
      );
    }
  }
}
