import { describe, expect, it, vi } from "vitest";

import { EmailDeliveryService } from "@/auth/registration/email-delivery.service";
import type { MailConfiguration } from "@/auth/registration/mail.config";

const mailMocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mailMocks.createTransport.mockReturnValue({
      sendMail: mailMocks.sendMail,
    }),
  },
}));

const CONFIGURATION: MailConfiguration = {
  disabled: false,
  frontendBaseUrl: "https://requirements.example/app/",
  from: "requirements@example.org",
  host: "smtp.example.org",
  password: "smtp-secret",
  port: 587,
  secure: false,
  username: "smtp-user",
};

describe("EmailDeliveryService", () => {
  it("sends the plaintext token only in the generated frontend link.", async () => {
    mailMocks.sendMail.mockResolvedValueOnce({});
    const service = new EmailDeliveryService(CONFIGURATION);

    await service.sendEmailVerification(
      "user@example.org",
      "Florian",
      "plaintext-token",
    );

    expect(mailMocks.createTransport).toHaveBeenCalledWith({
      host: "smtp.example.org",
      port: 587,
      secure: false,
      auth: { user: "smtp-user", pass: "smtp-secret" },
    });
    expect(mailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "requirements@example.org",
        to: "user@example.org",
        subject: "Verify your email address",
        text: expect.stringContaining(
          "https://requirements.example/app/verify-email?token=plaintext-token",
        ),
      }),
    );
  });

  it("does not create a transporter or send mail when delivery is explicitly disabled.", async () => {
    mailMocks.createTransport.mockClear();
    mailMocks.sendMail.mockClear();
    const service = new EmailDeliveryService({
      ...CONFIGURATION,
      disabled: true,
    });

    await service.sendEmailVerification(
      "user@example.org",
      "Florian",
      "plaintext-token",
    );

    expect(mailMocks.createTransport).not.toHaveBeenCalled();
    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });
});
