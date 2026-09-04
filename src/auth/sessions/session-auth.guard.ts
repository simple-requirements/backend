import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import type { AuthenticatedRequest } from "@/auth/sessions/authenticated-request";
import { SessionService } from "@/auth/sessions/session.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = /^Bearer ([^ ]+)$/.exec(authorization ?? "");

    if (match === null) {
      throw new UnauthorizedException("Authentication is required.");
    }

    request.authentication = await this.sessionService.authenticate(match[1]);

    return true;
  }
}
