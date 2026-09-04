import { BadRequestException, Logger } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { type EntityManager } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailDeliveryService } from "@/auth/registration/email-delivery.service";
import { AuthenticationBootstrap } from "@/auth/bootstrap/authentication-bootstrap.entity";
import { EmailVerificationToken } from "@/auth/registration/email-verification-token.entity";
import {
  EmailVerificationService,
  RESEND_RESPONSE,
} from "@/auth/registration/email-verification.service";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";

const USER_ID = "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11";
const TOKEN_ID = "4a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12";

function user(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: USER_ID,
    username: "Florian.W",
    normalizedUsername: "florian.w",
    email: "florian@example.org",
    displayName: "Florian",
    status: UserStatus.Pending,
    emailVerifiedAt: null,
    ...overrides,
  });
}

function token(
  overrides: Partial<EmailVerificationToken> = {},
): EmailVerificationToken {
  return Object.assign(new EmailVerificationToken(), {
    id: TOKEN_ID,
    userId: USER_ID,
    tokenHash: "a".repeat(64),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    consumedAt: null,
    invalidatedAt: null,
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    ...overrides,
  });
}

describe("EmailVerificationService", () => {
  const tokenRepository = {
    count: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
  };
  const userRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
  };
  const bootstrapRepository = {
    findOneBy: vi.fn(),
  };
  const manager = {
    getRepository: vi.fn((entity: unknown) => {
      if (entity === User) return userRepository;
      if (entity === AuthenticationBootstrap) return bootstrapRepository;
      return tokenRepository;
    }),
  };
  const dataSource = {
    transaction: vi.fn(
      (callback: (transactionManager: EntityManager) => unknown) =>
        callback(manager as unknown as EntityManager),
    ),
  };
  const tokenService = {
    generate: vi.fn(),
    hash: vi.fn(),
  };
  const emailDeliveryService = {
    sendEmailVerification: vi.fn(),
  };
  let service: EmailVerificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    tokenRepository.create.mockImplementation(
      (value: Partial<EmailVerificationToken>) => value,
    );
    tokenRepository.save.mockImplementation((value: EmailVerificationToken) =>
      Promise.resolve(value),
    );
    tokenRepository.update.mockResolvedValue({ affected: 1 });
    tokenRepository.count.mockResolvedValue(0);
    userRepository.save.mockImplementation((value: User) =>
      Promise.resolve(value),
    );
    bootstrapRepository.findOneBy.mockResolvedValue(null);
    tokenService.generate.mockReturnValue({
      plaintext: "plaintext-token",
      hash: "a".repeat(64),
    });
    tokenService.hash.mockReturnValue("a".repeat(64));
    emailDeliveryService.sendEmailVerification.mockResolvedValue(undefined);
    service = new EmailVerificationService(
      dataSource as unknown as DataSource,
      tokenService,
      emailDeliveryService as unknown as EmailDeliveryService,
    );
  });

  it("activates the initial Administrator after email confirmation.", async () => {
    const storedToken = token();
    const storedUser = user();
    tokenRepository.findOne.mockResolvedValue(storedToken);
    userRepository.findOne.mockResolvedValue(storedUser);
    bootstrapRepository.findOneBy.mockResolvedValue({
      id: 1,
      administratorUserId: USER_ID,
    });

    await service.confirm("plaintext-token");

    expect(storedUser.emailVerifiedAt).toBeInstanceOf(Date);
    expect(storedUser.status).toBe(UserStatus.Active);
  });

  it("stores only a hash with a 30-minute expiry and delivers the plaintext token.", async () => {
    const createdAt = Date.now();

    await service.issueForUser(user());

    expect(tokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: "a".repeat(64),
        consumedAt: null,
        invalidatedAt: null,
      }),
    );
    const createdToken = tokenRepository.create.mock
      .calls[0]?.[0] as EmailVerificationToken;
    expect(createdToken).not.toHaveProperty("plaintextToken");
    expect(createdToken.expiresAt.getTime()).toBeGreaterThanOrEqual(
      createdAt + 30 * 60 * 1000,
    );
    expect(emailDeliveryService.sendEmailVerification).toHaveBeenCalledWith(
      "florian@example.org",
      "Florian",
      "plaintext-token",
    );
  });

  it("keeps the token usable and conceals delivery failures.", async () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    emailDeliveryService.sendEmailVerification.mockRejectedValueOnce(
      new Error("SMTP unavailable"),
    );

    await expect(service.issueForUser(user())).resolves.toBeUndefined();
    expect(tokenRepository.save).toHaveBeenCalledOnce();
  });

  it("confirms a valid token, verifies the user, and invalidates other tokens.", async () => {
    const storedToken = token();
    const storedUser = user();
    tokenRepository.findOne.mockResolvedValue(storedToken);
    userRepository.findOne.mockResolvedValue(storedUser);

    await service.confirm("plaintext-token");

    expect(tokenRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: "pessimistic_write" } }),
    );
    expect(storedToken.consumedAt).toBeInstanceOf(Date);
    expect(storedUser.emailVerifiedAt).toBeInstanceOf(Date);
    expect(storedUser.status).toBe(UserStatus.Pending);
    expect(tokenRepository.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: USER_ID }),
      expect.objectContaining({ invalidatedAt: expect.any(Date) }),
    );
  });

  it.each([
    ["unknown", null],
    ["expired", token({ expiresAt: new Date(Date.now() - 1) })],
    ["consumed", token({ consumedAt: new Date() })],
    ["invalidated", token({ invalidatedAt: new Date() })],
  ])(
    "rejects an %s token with the generic error.",
    async (_case, storedToken) => {
      tokenRepository.findOne.mockResolvedValue(storedToken);

      await expect(service.confirm("plaintext-token")).rejects.toEqual(
        new BadRequestException(
          "The email verification link is invalid or has expired.",
        ),
      );
    },
  );

  it("returns the generic resend response without revealing an unknown account.", async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.resend("unknown")).resolves.toEqual(RESEND_RESPONSE);
    expect(emailDeliveryService.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("issues a resend for an eligible pending account.", async () => {
    userRepository.findOne.mockResolvedValue(user());
    tokenRepository.findOne.mockResolvedValue(
      token({ createdAt: new Date(Date.now() - 2 * 60 * 1000) }),
    );
    tokenRepository.count.mockResolvedValue(2);

    await expect(service.resend("Florian.W")).resolves.toEqual(RESEND_RESPONSE);
    expect(emailDeliveryService.sendEmailVerification).toHaveBeenCalledOnce();
  });

  it.each([
    ["already verified", user({ emailVerifiedAt: new Date() })],
    ["deactivated", user({ status: UserStatus.Deactivated })],
  ])(
    "does not resend for an account that is %s.",
    async (_case, storedUser) => {
      userRepository.findOne.mockResolvedValue(storedUser);

      await expect(service.resend("Florian.W")).resolves.toEqual(
        RESEND_RESPONSE,
      );
      expect(emailDeliveryService.sendEmailVerification).not.toHaveBeenCalled();
    },
  );

  it("enforces both the one-minute interval and five-per-hour limit.", async () => {
    userRepository.findOne.mockResolvedValue(user());
    tokenRepository.findOne.mockResolvedValueOnce(
      token({ createdAt: new Date() }),
    );

    await service.resend("Florian.W");
    expect(tokenService.generate).not.toHaveBeenCalled();

    tokenRepository.findOne.mockResolvedValueOnce(
      token({ createdAt: new Date(Date.now() - 2 * 60 * 1000) }),
    );
    tokenRepository.count.mockResolvedValueOnce(5);

    await service.resend("Florian.W");
    expect(tokenService.generate).not.toHaveBeenCalled();
  });
});
