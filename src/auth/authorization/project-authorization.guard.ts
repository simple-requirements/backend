import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AccountRole } from '@/auth/accounts/account-role.enum';
import { ProjectMembership } from '@/auth/authorization/project-membership.entity';
import { PROJECT_PERMISSION_KEY, ProjectPermission } from '@/auth/authorization/project-permission';
import type { AuthenticatedRequest } from '@/auth/sessions/authenticated-request';

@Injectable()
export class ProjectAuthorizationGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly dataSource: DataSource,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const permission = this.reflector.getAllAndOverride<ProjectPermission | undefined>(PROJECT_PERMISSION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (permission === undefined) return true;

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        if (request.authentication.role === AccountRole.Administrator) {
            return this.require(false);
        }

        const projectId = 'projectId' in request.params ? request.params.projectId : request.params.id;
        if (typeof projectId !== 'string') return true;

        const membership = await this.dataSource
            .getRepository(ProjectMembership)
            .findOneBy({ projectId, userId: request.authentication.user.id });
        if (membership === null) return this.require(false);

        if (permission === ProjectPermission.Read || permission === ProjectPermission.ReadProject) {
            return true;
        }
        if (permission === ProjectPermission.ManageRequirements) {
            return this.require(request.authentication.role === AccountRole.RequirementsEngineer);
        }
        return this.require(
            request.authentication.role === AccountRole.RequirementsEngineer
                || request.authentication.role === AccountRole.Developer,
        );
    }

    private require(allowed: boolean): true {
        if (!allowed) {
            throw new ForbiddenException('Project access is not permitted.');
        }
        return true;
    }
}
