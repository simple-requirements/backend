import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";

import type { SessionResponseDto } from "@/auth/dto/session-response.dto";
import type { UserAdministrationResponseDto } from "@/auth/dto/user-administration-response.dto";
import { GlobalUserRole } from "@/auth/authorization/global-user-role.entity";
import { SessionService } from "@/auth/sessions/session.service";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";

@Injectable()
export class UserAdministrationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sessions: SessionService,
  ) {}

  async list(): Promise<UserAdministrationResponseDto[]> {
    const users = await this.dataSource.getRepository(User).find({
      order: { username: "ASC" },
    });
    return this.toResponses(users);
  }

  async find(userId: string): Promise<UserAdministrationResponseDto> {
    const user = await this.requireUser(userId);
    const roles = await this.dataSource
      .getRepository(GlobalUserRole)
      .findBy({ userId });
    return this.toResponse(user, roles);
  }

  async updateStatus(
    userId: string,
    status: UserStatus.Active | UserStatus.Deactivated,
  ): Promise<UserAdministrationResponseDto> {
    const user = await this.requireUser(userId);
    if (status === UserStatus.Active && user.emailVerifiedAt === null) {
      throw new BadRequestException(
        "The user's email address must be verified before activation.",
      );
    }
    user.status = status;
    await this.dataSource.getRepository(User).save(user);
    if (status === UserStatus.Deactivated) {
      await this.sessions.revokeAllForUser(userId);
    }
    return this.find(userId);
  }

  async listSessions(userId: string): Promise<SessionResponseDto[]> {
    await this.requireUser(userId);
    return this.sessions.listForUser(userId);
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.requireUser(userId);
    const session = (await this.sessions.listForUser(userId)).find(
      ({ id }) => id === sessionId,
    );
    if (session === undefined) {
      throw new NotFoundException(
        `Session with id "${sessionId}" was not found for this user.`,
      );
    }
    await this.sessions.revokeSession(sessionId);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.requireUser(userId);
    await this.sessions.revokeAllForUser(userId);
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.dataSource
      .getRepository(User)
      .findOneBy({ id: userId });
    if (user === null) {
      throw new NotFoundException(`User with id "${userId}" was not found.`);
    }
    return user;
  }

  private async toResponses(
    users: User[],
  ): Promise<UserAdministrationResponseDto[]> {
    const roles = await this.dataSource.getRepository(GlobalUserRole).find();
    return users.map((user) => this.toResponse(user, roles));
  }

  private toResponse(
    user: User,
    roles: GlobalUserRole[],
  ): UserAdministrationResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      globalRoles: roles
        .filter(({ userId }) => userId === user.id)
        .map(({ role }) => role),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
