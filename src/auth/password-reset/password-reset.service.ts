import { createHash } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource, IsNull, MoreThan } from "typeorm";
import type { ConfirmPasswordResetDto } from "@/auth/dto/confirm-password-reset.dto";
import { EmailDeliveryService } from "@/auth/registration/email-delivery.service";
import { PasswordResetAttempt } from "@/auth/password-reset/password-reset-attempt.entity";
import { PasswordResetToken } from "@/auth/password-reset/password-reset-token.entity";
import { PasswordService } from "@/auth/accounts/password.service";
import { SessionService } from "@/auth/sessions/session.service";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";
import { VerificationTokenService } from "@/auth/registration/verification-token.service";

const RESPONSE = Object.freeze({
  message: "If the account is eligible, a password reset email will be sent.",
});
const WINDOW_MS = 15 * 60 * 1000;
const TOKEN_MS = 30 * 60 * 1000;

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tokens: VerificationTokenService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly email: EmailDeliveryService,
  ) {}

  async request(email: string, source: string): Promise<{ message: string }> {
    const sourceHash = createHash("sha256").update(source).digest("hex");
    const attempts = this.dataSource.getRepository(PasswordResetAttempt);
    if (
      (await attempts.count({
        where: {
          sourceHash,
          createdAt: MoreThan(new Date(Date.now() - WINDOW_MS)),
        },
      })) >= 5
    )
      return RESPONSE;
    await attempts.save(attempts.create({ sourceHash }));
    const user = await this.dataSource.getRepository(User).findOneBy({
      normalizedEmail: email.normalize("NFKC").toLocaleLowerCase("en-US"),
    });
    if (!user?.emailVerifiedAt || user.status === UserStatus.Deactivated)
      return RESPONSE;
    const generated = this.tokens.generate();
    const repository = this.dataSource.getRepository(PasswordResetToken);
    await repository.update(
      { userId: user.id, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );
    await repository.save(
      repository.create({
        userId: user.id,
        tokenHash: generated.hash,
        expiresAt: new Date(Date.now() + TOKEN_MS),
        consumedAt: null,
      }),
    );
    await this.email.sendPasswordReset(
      user.email,
      user.displayName,
      generated.plaintext,
    );
    return RESPONSE;
  }

  async confirm(dto: ConfirmPasswordResetDto): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(PasswordResetToken);
      const token = await repository.findOne({
        where: { tokenHash: this.tokens.hash(dto.token) },
        lock: { mode: "pessimistic_write" },
      });
      const now = new Date();
      if (token?.consumedAt !== null || token.expiresAt <= now)
        throw new BadRequestException(
          "The password reset token is invalid or expired.",
        );
      const user = await manager
        .getRepository(User)
        .findOneBy({ id: token.userId });
      if (user === null || user.status === UserStatus.Deactivated)
        throw new BadRequestException(
          "The password reset token is invalid or expired.",
        );
      user.passwordHash = await this.passwords.hash(dto.password);
      await manager.getRepository(User).save(user);
      token.consumedAt = now;
      await repository.save(token);
      await manager
        .getRepository(PasswordResetToken)
        .update({ userId: user.id, consumedAt: IsNull() }, { consumedAt: now });
      await this.sessions.revokeAllForUser(user.id);
    });
  }
}
