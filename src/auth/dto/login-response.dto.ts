import { ApiProperty } from "@nestjs/swagger";

import { AuthenticatedUserResponseDto } from "@/auth/dto/authenticated-user-response.dto";

export class LoginResponseDto {
  @ApiProperty({
    description:
      "Opaque bearer token. It is returned only once and must not be persisted by the SPA.",
  })
  accessToken!: string;

  @ApiProperty({ type: AuthenticatedUserResponseDto })
  user!: AuthenticatedUserResponseDto;
}
