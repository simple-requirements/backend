import { ApiProperty } from "@nestjs/swagger";

export class ResendEmailVerificationDto {
  @ApiProperty({
    example: "florian",
    description: "Case-insensitive local username.",
  })
  username!: string;
}
