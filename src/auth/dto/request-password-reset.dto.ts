import { ApiProperty } from "@nestjs/swagger";
export class RequestPasswordResetDto {
  @ApiProperty({ format: "email" }) email!: string;
}
