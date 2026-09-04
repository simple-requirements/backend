import { ApiProperty } from "@nestjs/swagger";

export class SessionResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ format: "date-time" })
  lastActivityAt!: Date;

  @ApiProperty({ format: "date-time", nullable: true })
  revokedAt!: Date | null;
}
