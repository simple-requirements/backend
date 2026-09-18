import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AccountRole } from '@/auth/accounts/account-role.enum';
import { UserStatus } from '@/auth/accounts/user-status.enum';
import { User } from '@/auth/accounts/users.entity';
import type { SessionResponseDto } from '@/auth/dto/session-response.dto';
import type { UserAdministrationResponseDto } from '@/auth/dto/user-administration-response.dto';
import { ProjectMembership } from '@/auth/authorization/project-membership.entity';
import { SessionService } from '@/auth/sessions/session.service';

@Injectable()
export class UserAdministrationService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly sessions: SessionService,
    ) {}

    async list(): Promise<UserAdministrationResponseDto[]> {
        const users = await this.dataSource.getRepository(User).find({ order: { username: 'ASC' } });
        return users.map((user) => this.toResponse(user));
    }

    async find(userId: string): Promise<UserAdministrationResponseDto> {
        return this.toResponse(await this.requireUser(userId));
    }

    async assignRole(userId: string, role: AccountRole): Promise<UserAdministrationResponseDto> {
        const user = await this.requireUser(userId);
        if (user.status === UserStatus.Active) {
            throw new ConflictException('The role of an active account cannot be changed.');
        }
        if (
            user.status === UserStatus.Deactivated
            && role === AccountRole.Administrator
            && user.role !== AccountRole.Administrator
        ) {
            const membershipCount = await this.dataSource.getRepository(ProjectMembership).countBy({ userId });
            if (membershipCount > 0) {
                throw new ConflictException(
                    'Project memberships must be removed before assigning the Administrator role.',
                );
            }
        }
        user.role = role;
        await this.dataSource.getRepository(User).save(user);
        return this.toResponse(user);
    }

    async updateStatus(
        userId: string,
        status: UserStatus.Active | UserStatus.Deactivated,
        actingUserId: string,
    ): Promise<UserAdministrationResponseDto> {
        const user = await this.requireUser(userId);
        if (status === UserStatus.Deactivated && actingUserId === userId) {
            throw new BadRequestException('Administrators cannot deactivate their own account.');
        }
        if (status === UserStatus.Active) {
            if (user.emailVerifiedAt === null) {
                throw new BadRequestException("The user's email address must be verified before activation.");
            }
            if (user.role === null) {
                throw new BadRequestException('An account role must be assigned before activation.');
            }
        }
        user.status = status;
        await this.dataSource.getRepository(User).save(user);
        if (status === UserStatus.Deactivated) {
            await this.sessions.revokeAllForUser(userId);
        }
        return this.toResponse(user);
    }

    async listSessions(userId: string): Promise<SessionResponseDto[]> {
        await this.requireUser(userId);
        return this.sessions.listForUser(userId);
    }

    async revokeSession(userId: string, sessionId: string, actingUserId: string): Promise<void> {
        await this.requireUser(userId);
        this.assertNotSelfSessionAdministration(userId, actingUserId);
        const session = (await this.sessions.listForUser(userId)).find(({ id }) => id === sessionId);
        if (session === undefined) {
            throw new NotFoundException(`Session with id "${sessionId}" was not found for this user.`);
        }
        await this.sessions.revokeSession(sessionId);
    }

    async revokeAllSessions(userId: string, actingUserId: string): Promise<void> {
        await this.requireUser(userId);
        this.assertNotSelfSessionAdministration(userId, actingUserId);
        await this.sessions.revokeAllForUser(userId);
    }

    private assertNotSelfSessionAdministration(userId: string, actingUserId: string): void {
        if (actingUserId === userId) {
            throw new BadRequestException(
                'Administrators cannot revoke their own sessions through administration. Use Logout instead.',
            );
        }
    }

    private async requireUser(userId: string): Promise<User> {
        const user = await this.dataSource.getRepository(User).findOneBy({ id: userId });
        if (user === null) {
            throw new NotFoundException(`User with id "${userId}" was not found.`);
        }
        return user;
    }

    private toResponse(user: User): UserAdministrationResponseDto {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            status: user.status,
            role: user.role,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
