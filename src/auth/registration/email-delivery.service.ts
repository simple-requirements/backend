import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";

import mailConfig from "@/auth/registration/mail.config";

@Injectable()
export class EmailDeliveryService {
  private readonly transporter: Transporter | null;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly configuration: ConfigType<typeof mailConfig>,
  ) {
    this.transporter = configuration.disabled
      ? null
      : nodemailer.createTransport({
          host: configuration.host,
          port: configuration.port,
          secure: configuration.secure,
          auth: { user: configuration.username, pass: configuration.password },
        });
  }

  async sendEmailVerification(
    recipient: string,
    displayName: string,
    plaintextToken: string,
  ): Promise<void> {
    if (this.transporter === null) {
      return;
    }

    const verificationUrl = new URL(
      "verify-email",
      this.configuration.frontendBaseUrl,
    );

    verificationUrl.searchParams.set("token", plaintextToken);

    await this.transporter.sendMail({
      from: this.configuration.from,
      to: recipient,
      subject: "Verify your email address",
      text: `Hello ${displayName},\n\nVerify your email address by opening this link:\n${verificationUrl.toString()}\n\nThis link expires in 30 minutes.`,
    });
  }

  async sendPasswordReset(
    recipient: string,
    displayName: string,
    plaintextToken: string,
  ): Promise<void> {
    if (this.transporter === null) return;
    const resetUrl = new URL(
      "reset-password",
      this.configuration.frontendBaseUrl,
    );
    resetUrl.searchParams.set("token", plaintextToken);
    await this.transporter.sendMail({
      from: this.configuration.from,
      to: recipient,
      subject: "Reset your password",
      text: `Hello ${displayName},\n\nReset your password by opening this link:\n${resetUrl.toString()}\n\nThis link expires in 30 minutes.`,
    });
  }
}
