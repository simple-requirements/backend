import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

import type { AuthenticatedRequest } from "@/auth/sessions/authenticated-request";
import { GlobalRole } from "@/auth/authorization/global-role.enum";

@Injectable()
export class AdministratorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (
      !request.authentication.globalRoles.includes(GlobalRole.Administrator)
    ) {
      throw new ForbiddenException("Administrator access is required.");
    }

    return true;
  }
}
