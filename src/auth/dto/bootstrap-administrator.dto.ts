import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BootstrapAdministratorDto {
  @ApiProperty({ example: "administrator" })
  username!: string;

  @ApiProperty({ example: "admin@example.org" })
  email!: string;

  @ApiProperty({ example: "Administrator" })
  displayName!: string;

  @ApiProperty({ minLength: 15, maxLength: 128, writeOnly: true })
  password!: string;

  @ApiPropertyOptional({ writeOnly: true, minLength: 1 })
  bootstrapSecret?: string;
}
