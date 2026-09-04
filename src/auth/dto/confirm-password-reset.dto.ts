import { ApiProperty } from "@nestjs/swagger";
export class ConfirmPasswordResetDto {
  @ApiProperty() token!: string;
  @ApiProperty({ minLength: 15, maxLength: 128 }) password!: string;
}
