import { ApiProperty } from "@nestjs/swagger";

export class ConfirmEmailVerificationDto {
  @ApiProperty({ description: "Single-use email verification token." })
  token!: string;
}
