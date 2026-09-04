import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { DataSource, IsNull, MoreThan, Not, type EntityManager } from "typeorm";

import { EmailDeliveryService } from "@/auth/registration/email-delivery.service";
import { EmailVerificationToken } from "@/auth/registration/email-verification-token.entity";
import {
  AUTHENTICATION_BOOTSTRAP_ID,
  AuthenticationBootstrap,
} from "@/auth/bootstrap/authentication-bootstrap.entity";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";
import { VerificationTokenService } from "@/auth/registration/verification-token.service";

const TOKEN_LIFETIME_MS = 30 * 60 * 1000;
const RESEND_INTERVAL_MS = 60 * 1000;
const RESEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_EMAILS_PER_WINDOW = 5;

export const RESEND_RESPONSE = Object.freeze({
  message: "If the account is eligible, a verification email will be sent.",
});

const INVALID_TOKEN_MESSAGE =
  "The email verification link is invalid or has expired.";

export interface PendingVerificationDelivery {
  displayName: string;
  email: string;
  plaintextToken: string;
}

function normalizeUsername(username: string): string {
  return username.normalize("NFKC").toLocaleLowerCase("en-US");
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly tokenService: VerificationTokenService,
    private readonly emailDeliveryService: EmailDeliveryService,
  ) {}

  async issueForUser(user: User): Promise<void> {
    const delivery = await this.dataSource.transaction((manager) =>
      this.prepareForUser(manager, user),
    );

    await this.deliver(delivery);
  }

  async confirm(plaintextToken: string): Promise<void> {
    const tokenHash = this.tokenService.hash(plaintextToken);

    await this.dataSource.transaction(async (manager) => {
      const tokenRepository = manager.getRepository(EmailVerificationToken);
      const token = await tokenRepository.findOne({
        where: { tokenHash },
        lock: { mode: "pessimistic_write" },
      });
      const now = new Date();

      if (
        token?.consumedAt !== null ||
        token.invalidatedAt !== null ||
        token.expiresAt.getTime() <= now.getTime()
      ) {
        throw new BadRequestException(INVALID_TOKEN_MESSAGE);
      }

      const userRepository = manager.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: token.userId },
        lock: { mode: "pessimistic_write" },
      });

      if (user === null || user.status === UserStatus.Deactivated) {
        throw new BadRequestException(INVALID_TOKEN_MESSAGE);
      }

      token.consumedAt = now;
      user.emailVerifiedAt ??= now;

      const bootstrap = await manager
        .getRepository(AuthenticationBootstrap)
        .findOneBy({
          id: AUTHENTICATION_BOOTSTRAP_ID,
          administratorUserId: user.id,
        });

      if (bootstrap !== null && user.status === UserStatus.Pending) {
        user.status = UserStatus.Active;
      }

      await tokenRepository.save(token);
      await userRepository.save(user);
      await tokenRepository.update(
        {
          userId: user.id,
          id: Not(token.id),
          consumedAt: IsNull(),
          invalidatedAt: IsNull(),
        },
        { invalidatedAt: now },
      );
    });
  }

  async resend(username: string): Promise<{ message: string }> {
    const delivery = await this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { normalizedUsername: normalizeUsername(username) },
        lock: { mode: "pessimistic_write" },
      });

      if (
        user?.status !== UserStatus.Pending ||
        user.emailVerifiedAt !== null
      ) {
        return null;
      }

      const tokenRepository = manager.getRepository(EmailVerificationToken);
      const now = new Date();
      const mostRecentToken = await tokenRepository.findOne({
        where: { userId: user.id },
        order: { createdAt: "DESC" },
      });

      if (
        mostRecentToken !== null &&
        mostRecentToken.createdAt.getTime() > now.getTime() - RESEND_INTERVAL_MS
      ) {
        return null;
      }

      const recentTokenCount = await tokenRepository.count({
        where: {
          userId: user.id,
          createdAt: MoreThan(new Date(now.getTime() - RESEND_WINDOW_MS)),
        },
      });

      return recentTokenCount >= MAX_EMAILS_PER_WINDOW
        ? null
        : this.prepareForUser(manager, user, now);
    });

    if (delivery !== null) {
      await this.deliver(delivery);
    }

    return RESEND_RESPONSE;
  }

  async prepareForUser(
    manager: EntityManager,
    user: User,
    now = new Date(),
  ): Promise<PendingVerificationDelivery> {
    const tokenRepository = manager.getRepository(EmailVerificationToken);
    const generatedToken = this.tokenService.generate();

    await tokenRepository.update(
      { userId: user.id, consumedAt: IsNull(), invalidatedAt: IsNull() },
      { invalidatedAt: now },
    );

    await tokenRepository.save(
      tokenRepository.create({
        userId: user.id,
        tokenHash: generatedToken.hash,
        expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS),
        consumedAt: null,
        invalidatedAt: null,
      }),
    );

    return {
      email: user.email,
      displayName: user.displayName,
      plaintextToken: generatedToken.plaintext,
    };
  }

  async deliver(delivery: PendingVerificationDelivery): Promise<void> {
    try {
      await this.emailDeliveryService.sendEmailVerification(
        delivery.email,
        delivery.displayName,
        delivery.plaintextToken,
      );
    } catch (error: unknown) {
      this.logger.error(
        "Email verification delivery failed.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
