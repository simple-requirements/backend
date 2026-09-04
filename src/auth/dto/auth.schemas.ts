import { z } from "zod";

import type { ZodValidationSchema } from "@/common/pipes/zod-validation.pipe";
import type { RegisterUserDto } from "@/auth/dto/register-user.dto";
import type { ConfirmEmailVerificationDto } from "@/auth/dto/confirm-email-verification.dto";
import type { ResendEmailVerificationDto } from "@/auth/dto/resend-email-verification.dto";
import type { BootstrapAdministratorDto } from "@/auth/dto/bootstrap-administrator.dto";
import type { LoginDto } from "@/auth/dto/login.dto";
import type { UpdateUserStatusDto } from "@/auth/dto/update-user-status.dto";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import type { SetProjectMembershipDto } from "@/auth/dto/set-project-membership.dto";
import { ProjectRole } from "@/auth/authorization/project-role.enum";
import type { RequestPasswordResetDto } from "@/auth/dto/request-password-reset.dto";
import type { ConfirmPasswordResetDto } from "@/auth/dto/confirm-password-reset.dto";

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,64}$/;

const objectBodySchema = (message: string) =>
  z.custom<Record<string, unknown>>(
    (value): value is Record<string, unknown> =>
      typeof value === "object" && value !== null && !Array.isArray(value),
    { message },
  );

const registrationBodySchema = objectBodySchema(
  "Registration request body must be an object.",
);

export const registerUserSchema: ZodValidationSchema<RegisterUserDto> =
  registrationBodySchema.pipe(
    z.object({
      username: z
        .string({ error: "Username must be a string." })
        .trim()
        .regex(
          USERNAME_PATTERN,
          "Username must contain 3 to 64 letters, digits, dots, underscores, or hyphens.",
        ),
      email: z
        .string({ error: "Email must be a string." })
        .trim()
        .toLowerCase()
        .pipe(z.email("Email must be valid.")),
      displayName: z
        .string({ error: "Display name must be a string." })
        .trim()
        .min(1, "Display name must not be empty.")
        .max(120, "Display name must not exceed 120 characters."),
      password: z
        .string({ error: "Password must be a string." })
        .min(15, "Password must contain at least 15 characters.")
        .max(128, "Password must not exceed 128 characters."),
    }),
  );

export const confirmEmailVerificationSchema: ZodValidationSchema<ConfirmEmailVerificationDto> =
  objectBodySchema("Email verification request body must be an object.").pipe(
    z.object({
      token: z
        .string({ error: "Verification token must be a string." })
        .trim()
        .min(1, "Verification token must not be empty.")
        .max(512, "Verification token must not exceed 512 characters."),
    }),
  );

export const resendEmailVerificationSchema: ZodValidationSchema<ResendEmailVerificationDto> =
  objectBodySchema("Verification resend request body must be an object.").pipe(
    z.object({
      username: z
        .string({ error: "Username must be a string." })
        .trim()
        .regex(
          USERNAME_PATTERN,
          "Username must contain 3 to 64 letters, digits, dots, underscores, or hyphens.",
        ),
    }),
  );

export const bootstrapAdministratorSchema: ZodValidationSchema<BootstrapAdministratorDto> =
  objectBodySchema(
    "Bootstrap registration request body must be an object.",
  ).pipe(
    z.object({
      username: z
        .string({ error: "Username must be a string." })
        .trim()
        .regex(
          USERNAME_PATTERN,
          "Username must contain 3 to 64 letters, digits, dots, underscores, or hyphens.",
        ),
      email: z
        .string({ error: "Email must be a string." })
        .trim()
        .toLowerCase()
        .pipe(z.email("Email must be valid.")),
      displayName: z
        .string({ error: "Display name must be a string." })
        .trim()
        .min(1, "Display name must not be empty.")
        .max(120, "Display name must not exceed 120 characters."),
      password: z
        .string({ error: "Password must be a string." })
        .min(15, "Password must contain at least 15 characters.")
        .max(128, "Password must not exceed 128 characters."),
      bootstrapSecret: z
        .string({ error: "Bootstrap secret must be a string." })
        .min(1)
        .optional(),
    }),
  );

export const loginSchema: ZodValidationSchema<LoginDto> = objectBodySchema(
  "Login request body must be an object.",
).pipe(
  z.object({
    username: z
      .string({ error: "Username must be a string." })
      .trim()
      .min(1, "Username must not be empty.")
      .max(64, "Username must not exceed 64 characters."),
    password: z
      .string({ error: "Password must be a string." })
      .min(1, "Password must not be empty.")
      .max(128, "Password must not exceed 128 characters."),
  }),
);

export const updateUserStatusSchema: ZodValidationSchema<UpdateUserStatusDto> =
  objectBodySchema("User status request body must be an object.").pipe(
    z.object({
      status: z.enum([UserStatus.Active, UserStatus.Deactivated], {
        error: "Status must be active or deactivated.",
      }),
    }),
  );

export const projectMembershipSchema: ZodValidationSchema<SetProjectMembershipDto> =
  objectBodySchema("Project membership request body must be an object.").pipe(
    z.object({
      roles: z
        .array(z.enum(ProjectRole))
        .min(1)
        .max(3)
        .refine(
          (roles) => new Set(roles).size === roles.length,
          "Roles must be unique.",
        ),
    }),
  );

export const requestPasswordResetSchema: ZodValidationSchema<RequestPasswordResetDto> =
  objectBodySchema("Password reset request body must be an object.").pipe(
    z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) }),
  );
export const confirmPasswordResetSchema: ZodValidationSchema<ConfirmPasswordResetDto> =
  objectBodySchema("Password reset confirmation body must be an object.").pipe(
    z.object({
      token: z.string().trim().min(1).max(512),
      password: z.string().min(15).max(128),
    }),
  );
