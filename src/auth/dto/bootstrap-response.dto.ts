import { ApiProperty } from "@nestjs/swagger";

export class BootstrapResponseDto {
  @ApiProperty({ example: "Bootstrap registration received." })
  message!: string;
}
