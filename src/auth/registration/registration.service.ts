import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, type Repository } from "typeorm";

import type { RegisterUserDto } from "@/auth/dto/register-user.dto";
import { EmailVerificationService } from "@/auth/registration/email-verification.service";
import { PasswordService } from "@/auth/accounts/password.service";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";
import { SessionService } from "@/auth/sessions/session.service";

const REGISTRATION_RESPONSE = Object.freeze({
  message: "Registration received.",
});

function normalizeIdentityAttribute(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;

  return (
    typeof driverError === "object" &&
    driverError !== null &&
    "code" in driverError &&
    driverError.code === "23505"
  );
}

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly sessions: SessionService,
  ) {}

  async register(registration: RegisterUserDto): Promise<{ message: string }> {
    const passwordHash = await this.passwordService.hash(registration.password);
    const user = this.usersRepository.create({
      username: registration.username,
      normalizedUsername: normalizeIdentityAttribute(registration.username),
      email: registration.email,
      normalizedEmail: normalizeIdentityAttribute(registration.email),
      displayName: registration.displayName,
      passwordHash,
      status: UserStatus.Pending,
      emailVerifiedAt: null,
    });

    let savedUser: User;

    try {
      savedUser = await this.usersRepository.save(user);
    } catch (error: unknown) {
      if (!isUniqueConstraintViolation(error)) {
        throw error;
      }

      return REGISTRATION_RESPONSE;
    }

    await this.emailVerificationService.issueForUser(savedUser);

    return REGISTRATION_RESPONSE;
  }

  findById(userId: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id: userId });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneBy({
      normalizedUsername: normalizeIdentityAttribute(username.trim()),
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({
      normalizedEmail: normalizeIdentityAttribute(email.trim()),
    });
  }

  async activateUser(userId: string): Promise<User> {
    return this.updateUser(userId, { status: UserStatus.Active });
  }

  async deactivateUser(userId: string): Promise<User> {
    const user = await this.updateUser(userId, {
      status: UserStatus.Deactivated,
    });
    await this.sessions.revokeAllForUser(userId);
    return user;
  }

  async changePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<User> {
    const user = await this.updateUser(userId, { passwordHash });
    await this.sessions.revokeAllForUser(userId);
    return user;
  }

  private async updateUser(
    userId: string,
    patch: Partial<Pick<User, "passwordHash" | "status">>,
  ): Promise<User> {
    const user = await this.findById(userId);

    if (user === null) {
      throw new NotFoundException(`User with id "${userId}" was not found.`);
    }

    return this.usersRepository.save(Object.assign(user, patch));
  }
}
