import { createHash, timingSafeEqual } from "node:crypto";

import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type OnApplicationBootstrap,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { DataSource, MoreThan, QueryFailedError } from "typeorm";

import {
  AUTHENTICATION_BOOTSTRAP_ID,
  AuthenticationBootstrap,
} from "@/auth/bootstrap/authentication-bootstrap.entity";
import { BootstrapRegistrationAttempt } from "@/auth/bootstrap/bootstrap-registration-attempt.entity";
import bootstrapConfig from "@/auth/bootstrap/bootstrap.config";
import type { BootstrapAdministratorDto } from "@/auth/dto/bootstrap-administrator.dto";
import {
  type PendingVerificationDelivery,
  EmailVerificationService,
} from "@/auth/registration/email-verification.service";
import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { GlobalUserRole } from "@/auth/authorization/global-user-role.entity";
import { PasswordService } from "@/auth/accounts/password.service";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const GENERIC_UNAVAILABLE_MESSAGE = "Bootstrap registration is not available.";

export const BOOTSTRAP_RESPONSE = Object.freeze({
  message: "Bootstrap registration received.",
});

function normalizeIdentityAttribute(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
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
export class BootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly dataSource: DataSource,
    private readonly passwordService: PasswordService,
    private readonly emailVerificationService: EmailVerificationService,
    @Inject(bootstrapConfig.KEY)
    private readonly configuration: ConfigType<typeof bootstrapConfig>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const { registrationAvailable } = await this.status();

    if (registrationAvailable && this.configuration.secret === null) {
      throw new Error(
        "INITIAL_ADMIN_BOOTSTRAP_SECRET is required until bootstrap has completed",
      );
    }
  }

  async status(): Promise<{ registrationAvailable: boolean }> {
    const completed = await this.dataSource
      .getRepository(AuthenticationBootstrap)
      .existsBy({ id: AUTHENTICATION_BOOTSTRAP_ID });

    return { registrationAvailable: !completed };
  }

  async registerAdministrator(
    registration: BootstrapAdministratorDto,
    requestSource: string,
  ): Promise<{ message: string }> {
    await this.enforceAttemptLimit(requestSource);
    this.assertSecret(registration.bootstrapSecret);
    const passwordHash = await this.passwordService.hash(registration.password);
    let delivery: PendingVerificationDelivery | null;

    try {
      delivery = await this.dataSource.transaction(async (manager) => {
        await manager.query(
          "SELECT pg_advisory_xact_lock(hashtext('authentication-bootstrap'))",
        );
        const bootstrapRepository = manager.getRepository(
          AuthenticationBootstrap,
        );

        if (
          await bootstrapRepository.existsBy({
            id: AUTHENTICATION_BOOTSTRAP_ID,
          })
        ) {
          throw new ConflictException(GENERIC_UNAVAILABLE_MESSAGE);
        }

        const userRepository = manager.getRepository(User);
        const user = await userRepository.save(
          userRepository.create({
            username: registration.username,
            normalizedUsername: normalizeIdentityAttribute(
              registration.username,
            ),
            email: registration.email,
            normalizedEmail: normalizeIdentityAttribute(registration.email),
            displayName: registration.displayName,
            passwordHash,
            status: UserStatus.Pending,
            emailVerifiedAt: null,
          }),
        );

        const roleRepository = manager.getRepository(GlobalUserRole);
        await roleRepository.save(
          roleRepository.create({
            userId: user.id,
            role: GlobalRole.Administrator,
          }),
        );

        const pendingDelivery =
          await this.emailVerificationService.prepareForUser(manager, user);
        const now = new Date();
        await bootstrapRepository.save(
          bootstrapRepository.create({
            id: AUTHENTICATION_BOOTSTRAP_ID,
            administratorUserId: user.id,
            completedAt: now,
          }),
        );

        return pendingDelivery;
      });
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        return BOOTSTRAP_RESPONSE;
      }

      throw error;
    }

    await this.emailVerificationService.deliver(delivery);

    return BOOTSTRAP_RESPONSE;
  }

  private assertSecret(candidate: string | undefined): void {
    const expectedDigest = digest(this.configuration.secret ?? "");
    const candidateDigest = digest(candidate ?? "");

    if (
      this.configuration.secret === null ||
      !timingSafeEqual(expectedDigest, candidateDigest)
    ) {
      throw new ForbiddenException(GENERIC_UNAVAILABLE_MESSAGE);
    }
  }

  private async enforceAttemptLimit(requestSource: string): Promise<void> {
    const sourceHash = digest(requestSource).toString("hex");
    const attemptCount = await this.dataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        sourceHash,
      ]);
      const repository = manager.getRepository(BootstrapRegistrationAttempt);
      await repository.save(repository.create({ sourceHash }));

      return repository.count({
        where: {
          sourceHash,
          createdAt: MoreThan(new Date(Date.now() - ATTEMPT_WINDOW_MS)),
        },
      });
    });

    if (attemptCount > MAX_ATTEMPTS_PER_WINDOW) {
      throw new HttpException(
        GENERIC_UNAVAILABLE_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
