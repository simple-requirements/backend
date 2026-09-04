import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthController } from "@/auth/sessions/auth.controller";
import { BootstrapController } from "@/auth/bootstrap/bootstrap.controller";
import { RegistrationService } from "@/auth/registration/registration.service";
import { AuthenticationBootstrap } from "@/auth/bootstrap/authentication-bootstrap.entity";
import { AuthenticationSession } from "@/auth/sessions/authentication-session.entity";
import { BootstrapRegistrationAttempt } from "@/auth/bootstrap/bootstrap-registration-attempt.entity";
import { BootstrapService } from "@/auth/bootstrap/bootstrap.service";
import bootstrapConfig from "@/auth/bootstrap/bootstrap.config";
import { EmailDeliveryService } from "@/auth/registration/email-delivery.service";
import { EmailVerificationToken } from "@/auth/registration/email-verification-token.entity";
import { EmailVerificationService } from "@/auth/registration/email-verification.service";
import { GlobalUserRole } from "@/auth/authorization/global-user-role.entity";
import { LoginAttempt } from "@/auth/sessions/login-attempt.entity";
import mailConfig from "@/auth/registration/mail.config";
import { PasswordService } from "@/auth/accounts/password.service";
import { User } from "@/auth/accounts/users.entity";
import { VerificationTokenService } from "@/auth/registration/verification-token.service";
import { SessionService } from "@/auth/sessions/session.service";
import { SessionTokenService } from "@/auth/sessions/session-token.service";
import { SessionAuthGuard } from "@/auth/sessions/session-auth.guard";
import { AdministratorGuard } from "@/auth/authorization/administrator.guard";
import { UserAdministrationController } from "@/auth/administration/user-administration.controller";
import { UserAdministrationService } from "@/auth/administration/user-administration.service";
import { ProjectMembership } from "@/auth/authorization/project-membership.entity";
import { ProjectMembershipController } from "@/auth/authorization/project-membership.controller";
import { ProjectMembershipService } from "@/auth/authorization/project-membership.service";
import { PasswordResetAttempt } from "@/auth/password-reset/password-reset-attempt.entity";
import { PasswordResetToken } from "@/auth/password-reset/password-reset-token.entity";
import { PasswordResetService } from "@/auth/password-reset/password-reset.service";
import { PasswordResetController } from "@/auth/password-reset/password-reset.controller";
import { ProjectAuthorizationGuard } from "@/auth/authorization/project-authorization.guard";
import { RegistrationController } from "@/auth/registration/registration.controller";

@Module({
  imports: [
    ConfigModule.forFeature(mailConfig),
    ConfigModule.forFeature(bootstrapConfig),
    TypeOrmModule.forFeature([
      User,
      EmailVerificationToken,
      AuthenticationBootstrap,
      BootstrapRegistrationAttempt,
      GlobalUserRole,
      AuthenticationSession,
      LoginAttempt,
      ProjectMembership,
      PasswordResetAttempt,
      PasswordResetToken,
    ]),
  ],
  controllers: [
    AuthController,
    BootstrapController,
    PasswordResetController,
    RegistrationController,
    UserAdministrationController,
    ProjectMembershipController,
  ],
  providers: [
    RegistrationService,
    PasswordService,
    VerificationTokenService,
    EmailDeliveryService,
    EmailVerificationService,
    BootstrapService,
    SessionService,
    SessionTokenService,
    SessionAuthGuard,
    AdministratorGuard,
    UserAdministrationService,
    ProjectMembershipService,
    PasswordResetService,
    ProjectAuthorizationGuard,
  ],
  exports: [
    RegistrationService,
    PasswordService,
    SessionService,
    SessionAuthGuard,
    ProjectAuthorizationGuard,
    ProjectMembershipService,
  ],
})
// Nest modules are declarative; the decorator contains the module configuration.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
