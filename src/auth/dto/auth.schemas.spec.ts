import { describe, expect, it } from "vitest";

import {
  bootstrapAdministratorSchema,
  confirmEmailVerificationSchema,
  confirmPasswordResetSchema,
  loginSchema,
  projectMembershipSchema,
  registerUserSchema,
  resendEmailVerificationSchema,
  requestPasswordResetSchema,
  updateUserStatusSchema,
} from "@/auth/dto/auth.schemas";
import { UserStatus } from "@/auth/accounts/user-status.enum";

const VALID_REGISTRATION = {
  username: "Florian.W",
  email: "Florian@example.org",
  displayName: "Florian",
  password: "correct horse battery staple",
};

describe("registerUserSchema", () => {
  it("normalizes registration fields without changing the password.", () => {
    expect(
      registerUserSchema.parse({
        ...VALID_REGISTRATION,
        username: "  Florian.W  ",
        email: "  Florian@Example.ORG  ",
        displayName: "  Florian W.  ",
      }),
    ).toEqual({
      ...VALID_REGISTRATION,
      username: "Florian.W",
      email: "florian@example.org",
      displayName: "Florian W.",
    });
  });

  it.each([
    [
      { ...VALID_REGISTRATION, username: "x" },
      "Username must contain 3 to 64 letters, digits, dots, underscores, or hyphens.",
    ],
    [
      { ...VALID_REGISTRATION, username: "invalid user" },
      "Username must contain 3 to 64 letters, digits, dots, underscores, or hyphens.",
    ],
    [{ ...VALID_REGISTRATION, email: "not-an-email" }, "Email must be valid."],
    [
      { ...VALID_REGISTRATION, displayName: "   " },
      "Display name must not be empty.",
    ],
    [
      { ...VALID_REGISTRATION, password: "too short" },
      "Password must contain at least 15 characters.",
    ],
  ])(
    "rejects malformed registration data.",
    (registration, expectedMessage) => {
      const result = registerUserSchema.safeParse(registration);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(expectedMessage);
      }
    },
  );
});

describe("membership and password recovery schemas", () => {
  it("accepts unique project roles and valid recovery inputs.", () => {
    expect(
      projectMembershipSchema.parse({
        roles: ["requirements_engineer", "developer"],
      }),
    ).toEqual({ roles: ["requirements_engineer", "developer"] });
    expect(
      requestPasswordResetSchema.parse({ email: " USER@Example.org " }),
    ).toEqual({ email: "user@example.org" });
    expect(
      confirmPasswordResetSchema.safeParse({
        token: "token",
        password: "correct horse battery staple",
      }).success,
    ).toBe(true);
  });
  it("rejects duplicate roles, invalid email, and weak reset passwords.", () => {
    expect(
      projectMembershipSchema.safeParse({ roles: ["viewer", "viewer"] })
        .success,
    ).toBe(false);
    expect(
      requestPasswordResetSchema.safeParse({ email: "invalid" }).success,
    ).toBe(false);
    expect(
      confirmPasswordResetSchema.safeParse({
        token: "token",
        password: "short",
      }).success,
    ).toBe(false);
  });
});

describe("email verification schemas", () => {
  it("trims valid confirmation tokens and resend usernames.", () => {
    expect(
      confirmEmailVerificationSchema.parse({ token: "  secure-token  " }),
    ).toEqual({ token: "secure-token" });
    expect(
      resendEmailVerificationSchema.parse({ username: "  Florian.W  " }),
    ).toEqual({ username: "Florian.W" });
  });

  it("rejects empty confirmation tokens and malformed usernames.", () => {
    expect(
      confirmEmailVerificationSchema.safeParse({ token: "   " }).success,
    ).toBe(false);
    expect(
      resendEmailVerificationSchema.safeParse({ username: "invalid user" })
        .success,
    ).toBe(false);
  });
});

describe("bootstrapAdministratorSchema", () => {
  it("normalizes identity attributes and permits a missing secret for generic rejection.", () => {
    expect(
      bootstrapAdministratorSchema.parse({
        ...VALID_REGISTRATION,
        bootstrapSecret: undefined,
      }),
    ).toEqual({
      ...VALID_REGISTRATION,
      email: "florian@example.org",
      bootstrapSecret: undefined,
    });
  });

  it("validates bootstrap registration account fields.", () => {
    expect(
      bootstrapAdministratorSchema.safeParse({
        ...VALID_REGISTRATION,
        password: "too short",
      }).success,
    ).toBe(false);
  });
});

describe("session and administration schemas", () => {
  it("accepts trimmed login credentials and supported account states.", () => {
    expect(
      loginSchema.parse({ username: " Admin ", password: "secret" }),
    ).toEqual({ username: "Admin", password: "secret" });
    expect(updateUserStatusSchema.parse({ status: UserStatus.Active })).toEqual(
      { status: UserStatus.Active },
    );
    expect(
      updateUserStatusSchema.parse({ status: UserStatus.Deactivated }),
    ).toEqual({ status: UserStatus.Deactivated });
  });

  it("rejects empty credentials and pending as an administrative target state.", () => {
    expect(loginSchema.safeParse({ username: "", password: "" }).success).toBe(
      false,
    );
    expect(
      updateUserStatusSchema.safeParse({ status: UserStatus.Pending }).success,
    ).toBe(false);
  });
});
