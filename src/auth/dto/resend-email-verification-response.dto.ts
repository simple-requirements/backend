import { ApiProperty } from "@nestjs/swagger";

export class ResendEmailVerificationResponseDto {
  @ApiProperty({
    example: "If the account is eligible, a verification email will be sent.",
  })
  message!: string;
}
