import type { Request } from "express";

import type { AccountRole } from "@/auth/accounts/account-role.enum";
import type { User } from "@/auth/accounts/users.entity";
import type { AuthenticationSession } from "@/auth/sessions/authentication-session.entity";

export interface AuthenticatedPrincipal {
  role: AccountRole;
  session: AuthenticationSession;
  user: User;
}

export interface AuthenticatedRequest extends Request {
  authentication: AuthenticatedPrincipal;
}
