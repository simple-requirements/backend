import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DataSource } from "typeorm";
import type { AuthenticatedRequest } from "@/auth/sessions/authenticated-request";
import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { ProjectMembership } from "@/auth/authorization/project-membership.entity";
import {
  PROJECT_PERMISSION_KEY,
  ProjectPermission,
} from "@/auth/authorization/project-permission";
import { ProjectRole } from "@/auth/authorization/project-role.enum";

@Injectable()
export class ProjectAuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<
      ProjectPermission | undefined
    >(PROJECT_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (permission === undefined) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const administrator = request.authentication.globalRoles.includes(
      GlobalRole.Administrator,
    );
    if (permission === ProjectPermission.Administer)
      return this.require(administrator);
    const projectId =
      "projectId" in request.params
        ? request.params.projectId
        : request.params.id;
    if (typeof projectId !== "string") {
      return true;
    }
    if (permission === ProjectPermission.ReadProject && administrator)
      return true;
    const memberships = await this.dataSource
      .getRepository(ProjectMembership)
      .findBy({ projectId, userId: request.authentication.user.id });
    const roles = new Set(memberships.map(({ role }) => role));
    if (
      permission === ProjectPermission.Read ||
      permission === ProjectPermission.ReadProject
    )
      return this.require(roles.size > 0);
    if (permission === ProjectPermission.ManageRequirements)
      return this.require(roles.has(ProjectRole.RequirementsEngineer));
    return this.require(
      roles.has(ProjectRole.RequirementsEngineer) ||
        roles.has(ProjectRole.Developer),
    );
  }
  private require(allowed: boolean): true {
    if (!allowed)
      throw new ForbiddenException("Project access is not permitted.");
    return true;
  }
}
