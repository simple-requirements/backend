import { ApiProperty } from "@nestjs/swagger";

export class BootstrapStatusResponseDto {
  @ApiProperty({ example: true })
  registrationAvailable!: boolean;
}
