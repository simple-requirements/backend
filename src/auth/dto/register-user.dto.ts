import { ApiProperty } from "@nestjs/swagger";

export class RegisterUserDto {
  @ApiProperty({
    example: "florian",
    description: "Unique, case-insensitive login name.",
  })
  username!: string;

  @ApiProperty({
    example: "florian@example.org",
    description: "Unique email address used for verification and recovery.",
  })
  email!: string;

  @ApiProperty({ example: "Florian", description: "Human-readable user name." })
  displayName!: string;

  @ApiProperty({
    example: "a sufficiently long password",
    minLength: 15,
    maxLength: 128,
    writeOnly: true,
  })
  password!: string;
}
