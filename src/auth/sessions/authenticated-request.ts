import type { Request } from "express";

import type { AuthenticationSession } from "@/auth/sessions/authentication-session.entity";
import type { GlobalRole } from "@/auth/authorization/global-role.enum";
import type { User } from "@/auth/accounts/users.entity";

export interface AuthenticatedPrincipal {
  globalRoles: readonly GlobalRole[];
  session: AuthenticationSession;
  user: User;
}

export interface AuthenticatedRequest extends Request {
  authentication: AuthenticatedPrincipal;
}
