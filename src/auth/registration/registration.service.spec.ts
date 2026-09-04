import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, type TestingModule } from "@nestjs/testing";
import { QueryFailedError } from "typeorm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { RegistrationService } from "@/auth/registration/registration.service";
import type { RegisterUserDto } from "@/auth/dto/register-user.dto";
import { EmailVerificationService } from "@/auth/registration/email-verification.service";
import { PasswordService } from "@/auth/accounts/password.service";
import { SessionService } from "@/auth/sessions/session.service";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";

const REGISTRATION: RegisterUserDto = {
  username: "Florian.W",
  email: "florian@example.org",
  displayName: "Florian",
  password: "correct horse battery staple",
};

describe("RegistrationService", () => {
  const usersRepository = {
    create: vi.fn(),
    findOneBy: vi.fn(),
    save: vi.fn(),
  };
  const passwordService = {
    hash: vi.fn(),
    verify: vi.fn(),
  };
  const emailVerificationService = { issueForUser: vi.fn() };
  const sessionService = { revokeAllForUser: vi.fn() };
  let service: RegistrationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: PasswordService, useValue: passwordService },
        {
          provide: EmailVerificationService,
          useValue: emailVerificationService,
        },
        { provide: SessionService, useValue: sessionService },
      ],
    }).compile();

    service = module.get(RegistrationService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    passwordService.hash.mockResolvedValue("$argon2id$hashed-password");
    usersRepository.create.mockImplementation((user: Partial<User>) => user);
    usersRepository.save.mockImplementation((user: User) =>
      Promise.resolve(user),
    );
    emailVerificationService.issueForUser.mockResolvedValue(undefined);
    sessionService.revokeAllForUser.mockResolvedValue(0);
  });

  it("creates a pending user with normalized identity attributes and a password hash.", async () => {
    await expect(service.register(REGISTRATION)).resolves.toEqual({
      message: "Registration received.",
    });

    expect(passwordService.hash).toHaveBeenCalledWith(REGISTRATION.password);
    expect(usersRepository.create).toHaveBeenCalledWith({
      username: "Florian.W",
      normalizedUsername: "florian.w",
      email: "florian@example.org",
      normalizedEmail: "florian@example.org",
      displayName: "Florian",
      // Test-only encoded hash fixture; no plaintext credential is stored here.
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      passwordHash: "$argon2id$hashed-password",
      status: UserStatus.Pending,
      emailVerifiedAt: null,
    });
    expect(usersRepository.create.mock.calls[0]?.[0]).not.toHaveProperty(
      "password",
    );
    expect(emailVerificationService.issueForUser).toHaveBeenCalledOnce();
  });

  it("returns the same generic response for a uniqueness conflict.", async () => {
    const driverError = Object.assign(new Error("duplicate user"), {
      code: "23505",
    });
    usersRepository.save.mockRejectedValueOnce(
      new QueryFailedError("INSERT INTO users", [], driverError),
    );

    await expect(service.register(REGISTRATION)).resolves.toEqual({
      message: "Registration received.",
    });
    expect(emailVerificationService.issueForUser).not.toHaveBeenCalled();
  });

  it("does not hide unexpected persistence errors.", async () => {
    usersRepository.save.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await expect(service.register(REGISTRATION)).rejects.toThrow(
      "database unavailable",
    );
  });

  it("looks up usernames and emails case-insensitively.", async () => {
    usersRepository.findOneBy.mockResolvedValue(null);

    await service.findByUsername("  FLORIAN.W  ");
    await service.findByEmail("  Florian@Example.ORG  ");

    expect(usersRepository.findOneBy).toHaveBeenNthCalledWith(1, {
      normalizedUsername: "florian.w",
    });
    expect(usersRepository.findOneBy).toHaveBeenNthCalledWith(2, {
      normalizedEmail: "florian@example.org",
    });
  });

  it.each([
    ["activate", UserStatus.Active],
    ["deactivate", UserStatus.Deactivated],
  ] as const)(
    "can %s a stored user through the internal service.",
    async (operation, expectedStatus) => {
      const user = Object.assign(new User(), {
        id: "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
        status: UserStatus.Pending,
      });
      usersRepository.findOneBy.mockResolvedValue(user);

      const result =
        operation === "activate"
          ? await service.activateUser(user.id)
          : await service.deactivateUser(user.id);

      expect(result.status).toBe(expectedStatus);
      expect(usersRepository.save).toHaveBeenCalledWith(user);
      expect(sessionService.revokeAllForUser).toHaveBeenCalledTimes(
        operation === "deactivate" ? 1 : 0,
      );
    },
  );

  it("changes only the stored password hash through the internal service.", async () => {
    const user = Object.assign(new User(), {
      id: "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
      // Test-only encoded hash fixture.
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      passwordHash: "old-encoded-value",
      status: UserStatus.Active,
    });
    usersRepository.findOneBy.mockResolvedValue(user);

    const updatedUser = await service.changePasswordHash(
      user.id,
      "new-encoded-value",
    );

    expect(updatedUser.passwordHash).toBe("new-encoded-value");
    expect(updatedUser.status).toBe(UserStatus.Active);
    expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(user.id);
  });

  it("rejects internal updates for an unknown user.", async () => {
    usersRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.activateUser("3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11"),
    ).rejects.toThrow(
      'User with id "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11" was not found.',
    );
  });
});
