import { ApiProperty } from "@nestjs/swagger";

export class RegistrationResponseDto {
  @ApiProperty({ example: "Registration received." })
  message!: string;
}
