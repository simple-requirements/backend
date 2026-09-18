import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { AccountRole } from '@/auth/accounts/account-role.enum';
import type { AuthenticatedRequest } from '@/auth/sessions/authenticated-request';

@Injectable()
export class AdministratorGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

        if (request.authentication.role !== AccountRole.Administrator) {
            throw new ForbiddenException('Administrator access is required.');
        }

        return true;
    }
}
