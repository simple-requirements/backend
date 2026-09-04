import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
} from "@nestjs/common";
import type { DataSource, EntityManager } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationBootstrap } from "@/auth/bootstrap/authentication-bootstrap.entity";
import { BootstrapRegistrationAttempt } from "@/auth/bootstrap/bootstrap-registration-attempt.entity";
import {
  BOOTSTRAP_RESPONSE,
  BootstrapService,
} from "@/auth/bootstrap/bootstrap.service";
import type { BootstrapConfiguration } from "@/auth/bootstrap/bootstrap.config";
import { BootstrapAdministratorDto } from "@/auth/dto/bootstrap-administrator.dto";
import type { EmailVerificationService } from "@/auth/registration/email-verification.service";
import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { GlobalUserRole } from "@/auth/authorization/global-user-role.entity";
import type { PasswordService } from "@/auth/accounts/password.service";
import { UserStatus } from "@/auth/accounts/user-status.enum";

const USER_ID = "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11";
const CONFIGURATION = {
  secret: "test-only-bootstrap-secret-with-32-characters",
} satisfies BootstrapConfiguration;
const REGISTRATION = Object.assign(new BootstrapAdministratorDto(), {
  username: "Administrator",
  email: "admin@example.org",
  displayName: "Initial Administrator",
  password: "correct horse battery staple",
  bootstrapSecret: CONFIGURATION.secret,
});

describe("BootstrapService", () => {
  const attemptRepository = {
    count: vi.fn(),
    create: vi.fn((value: object) => value),
    save: vi.fn(),
  };
  const bootstrapRepository = {
    create: vi.fn((value: object) => value),
    existsBy: vi.fn(),
    save: vi.fn(),
  };
  const userRepository = {
    create: vi.fn((value: object) => value),
    save: vi.fn(),
  };
  const roleRepository = {
    create: vi.fn((value: object) => value),
    save: vi.fn(),
  };
  const manager = {
    getRepository: vi.fn((entity: unknown) => {
      if (entity === AuthenticationBootstrap) return bootstrapRepository;
      if (entity === BootstrapRegistrationAttempt) return attemptRepository;
      if (entity === GlobalUserRole) return roleRepository;
      return userRepository;
    }),
    query: vi.fn(),
  };
  const dataSource = {
    getRepository: vi.fn(() => bootstrapRepository),
    transaction: vi.fn(
      (callback: (transactionManager: EntityManager) => unknown) =>
        callback(manager as unknown as EntityManager),
    ),
  };
  const passwordService = { hash: vi.fn() };
  const emailVerificationService = {
    deliver: vi.fn(),
    prepareForUser: vi.fn(),
  };
  let service: BootstrapService;

  beforeEach(() => {
    vi.clearAllMocks();
    attemptRepository.count.mockResolvedValue(1);
    attemptRepository.save.mockResolvedValue(undefined);
    bootstrapRepository.existsBy.mockResolvedValue(false);
    bootstrapRepository.save.mockResolvedValue(undefined);
    userRepository.save.mockImplementation((value: object) =>
      Promise.resolve({ ...value, id: USER_ID }),
    );
    roleRepository.save.mockResolvedValue(undefined);
    manager.query.mockResolvedValue([]);
    passwordService.hash.mockResolvedValue("encoded-password-hash");
    emailVerificationService.prepareForUser.mockResolvedValue({
      email: REGISTRATION.email,
      displayName: REGISTRATION.displayName,
      plaintextToken: "plaintext-verification-token",
    });
    emailVerificationService.deliver.mockResolvedValue(undefined);
    service = new BootstrapService(
      dataSource as unknown as DataSource,
      passwordService as unknown as PasswordService,
      emailVerificationService as unknown as EmailVerificationService,
      CONFIGURATION,
    );
  });

  it("reports bootstrap availability without exposing configuration.", async () => {
    await expect(service.status()).resolves.toEqual({
      registrationAvailable: true,
    });
    bootstrapRepository.existsBy.mockResolvedValueOnce(true);
    await expect(service.status()).resolves.toEqual({
      registrationAvailable: false,
    });
  });

  it("requires the deployment secret at startup only before completion.", async () => {
    const serviceWithoutSecret = new BootstrapService(
      dataSource as unknown as DataSource,
      passwordService as unknown as PasswordService,
      emailVerificationService as unknown as EmailVerificationService,
      { secret: null },
    );

    await expect(serviceWithoutSecret.onApplicationBootstrap()).rejects.toThrow(
      "INITIAL_ADMIN_BOOTSTRAP_SECRET is required until bootstrap has completed",
    );

    bootstrapRepository.existsBy.mockResolvedValue(true);
    await expect(
      serviceWithoutSecret.onApplicationBootstrap(),
    ).resolves.toBeUndefined();
  });

  it("atomically creates a pending Administrator and verification token.", async () => {
    await expect(
      service.registerAdministrator(REGISTRATION, "127.0.0.1"),
    ).resolves.toEqual(BOOTSTRAP_RESPONSE);

    expect(passwordService.hash).toHaveBeenCalledWith(REGISTRATION.password);
    expect(manager.query).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtext('authentication-bootstrap'))",
    );
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedUsername: "administrator",
        normalizedEmail: "admin@example.org",
        status: UserStatus.Pending,
        emailVerifiedAt: null,
      }),
    );
    expect(roleRepository.create).toHaveBeenCalledWith({
      userId: USER_ID,
      role: GlobalRole.Administrator,
    });
    expect(emailVerificationService.prepareForUser).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ id: USER_ID }),
    );
    expect(bootstrapRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        administratorUserId: USER_ID,
        completedAt: expect.any(Date),
      }),
    );
    expect(emailVerificationService.deliver).toHaveBeenCalledOnce();
  });

  it.each([undefined, "incorrect-secret"])(
    "rejects a missing or incorrect secret generically.",
    async (bootstrapSecret) => {
      await expect(
        service.registerAdministrator(
          Object.assign(new BootstrapAdministratorDto(), REGISTRATION, {
            bootstrapSecret,
          }),
          "127.0.0.1",
        ),
      ).rejects.toEqual(
        new ForbiddenException("Bootstrap registration is not available."),
      );
      expect(passwordService.hash).not.toHaveBeenCalled();
    },
  );

  it("permanently rejects registration after bootstrap completion.", async () => {
    bootstrapRepository.existsBy.mockResolvedValue(true);

    await expect(
      service.registerAdministrator(REGISTRATION, "127.0.0.1"),
    ).rejects.toEqual(
      new ConflictException("Bootstrap registration is not available."),
    );
    expect(emailVerificationService.deliver).not.toHaveBeenCalled();
  });

  it("rate-limits repeated attempts by a hashed request source.", async () => {
    attemptRepository.count.mockResolvedValue(6);

    await expect(
      service.registerAdministrator(REGISTRATION, "127.0.0.1"),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    expect(attemptRepository.create).toHaveBeenCalledWith({
      sourceHash: expect.stringMatching(/^[a-f\d]{64}$/),
    });
    expect(passwordService.hash).not.toHaveBeenCalled();
  });

  it("does not send email when the atomic transaction fails.", async () => {
    bootstrapRepository.save.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await expect(
      service.registerAdministrator(REGISTRATION, "127.0.0.1"),
    ).rejects.toThrow("database unavailable");
    expect(emailVerificationService.deliver).not.toHaveBeenCalled();
  });
});
