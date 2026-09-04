import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "administrator" })
  username!: string;

  @ApiProperty({ writeOnly: true })
  password!: string;
}
