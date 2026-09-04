import { createHash } from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { DataSource, IsNull, MoreThan, type EntityManager } from "typeorm";

import type { AuthenticatedPrincipal } from "@/auth/sessions/authenticated-request";
import { AuthenticationSession } from "@/auth/sessions/authentication-session.entity";
import type { LoginDto } from "@/auth/dto/login.dto";
import type { LoginResponseDto } from "@/auth/dto/login-response.dto";
import { GlobalUserRole } from "@/auth/authorization/global-user-role.entity";
import { LoginAttempt } from "@/auth/sessions/login-attempt.entity";
import { PasswordService } from "@/auth/accounts/password.service";
import { SessionTokenService } from "@/auth/sessions/session-token.service";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";

const SESSION_INACTIVITY_MS = 60 * 60 * 1000;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const GENERIC_LOGIN_FAILURE = "Invalid username or password.";

// Test-independent Argon2id value used to equalize password verification for
// unknown or rate-limited accounts. It is not an application credential.
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$uaH7tMjvdu/KJ9Q4jHzAtQ$q+T5rKjJuJSLC5SPyTz51xkXU0Z+lMLwqwwQvGhaEBg";

function normalizeUsername(username: string): string {
  return username.normalize("NFKC").toLocaleLowerCase("en-US");
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

@Injectable()
export class SessionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly passwordService: PasswordService,
    private readonly tokenService: SessionTokenService,
  ) {}

  async login(
    login: LoginDto,
    requestSource: string,
  ): Promise<LoginResponseDto> {
    const normalizedUsername = normalizeUsername(login.username);
    const sourceHash = hash(requestSource);
    const usernameHash = hash(normalizedUsername);
    const result = await this.dataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `${sourceHash}:${usernameHash}`,
      ]);
      const attempts = manager.getRepository(LoginAttempt);
      const recentFailureCount = await attempts.count({
        where: {
          sourceHash,
          usernameHash,
          createdAt: MoreThan(new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MS)),
        },
      });

      if (recentFailureCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
        await this.passwordService.verify(DUMMY_PASSWORD_HASH, login.password);
        return null;
      }

      const user = await manager.getRepository(User).findOneBy({
        normalizedUsername,
      });
      const passwordMatches = await this.passwordService.verify(
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        login.password,
      );

      if (
        user === null ||
        !passwordMatches ||
        user.status !== UserStatus.Active ||
        user.emailVerifiedAt === null
      ) {
        await attempts.save(attempts.create({ sourceHash, usernameHash }));
        return null;
      }

      await attempts.delete({ sourceHash, usernameHash });

      return this.createSession(manager, user);
    });

    if (result === null) {
      throw new UnauthorizedException(GENERIC_LOGIN_FAILURE);
    }

    return result;
  }

  async authenticate(plaintextToken: string): Promise<AuthenticatedPrincipal> {
    const tokenHash = this.tokenService.hash(plaintextToken);
    const principal = await this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(AuthenticationSession);
      const session = await sessions.findOne({
        where: { tokenHash },
        relations: { user: true },
        lock: { mode: "pessimistic_write" },
      });
      const now = new Date();

      if (session === null) {
        return null;
      }

      const expired =
        session.lastActivityAt.getTime() <=
        now.getTime() - SESSION_INACTIVITY_MS;

      if (
        session.revokedAt !== null ||
        expired ||
        session.user.status !== UserStatus.Active
      ) {
        if (session.revokedAt === null) {
          session.revokedAt = now;
          await sessions.save(session);
        }

        return null;
      }

      session.lastActivityAt = now;
      await sessions.save(session);
      const roles = await manager.getRepository(GlobalUserRole).findBy({
        userId: session.userId,
      });

      return {
        user: session.user,
        session,
        globalRoles: roles.map((role) => role.role),
      } satisfies AuthenticatedPrincipal;
    });

    if (principal === null) {
      throw new UnauthorizedException("Authentication is required.");
    }

    return principal;
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(AuthenticationSession)
      .update(
        { id: sessionId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );

    return (result.affected ?? 0) > 0;
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.dataSource
      .getRepository(AuthenticationSession)
      .update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });

    return result.affected ?? 0;
  }

  listForUser(userId: string): Promise<AuthenticationSession[]> {
    return this.dataSource.getRepository(AuthenticationSession).find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  private async createSession(
    manager: EntityManager,
    user: User,
  ): Promise<LoginResponseDto> {
    const generatedToken = this.tokenService.generate();
    const sessions = manager.getRepository(AuthenticationSession);
    const now = new Date();
    await sessions.save(
      sessions.create({
        userId: user.id,
        tokenHash: generatedToken.hash,
        lastActivityAt: now,
        revokedAt: null,
      }),
    );
    const roles = await manager.getRepository(GlobalUserRole).findBy({
      userId: user.id,
    });

    return {
      accessToken: generatedToken.plaintext,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        globalRoles: roles.map((role) => role.role),
      },
    };
  }
}
