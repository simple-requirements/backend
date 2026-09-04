import { ApiProperty } from "@nestjs/swagger";

import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { UserStatus } from "@/auth/accounts/user-status.enum";

export class AuthenticatedUserResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty({ format: "email" })
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ enum: GlobalRole, isArray: true })
  globalRoles!: GlobalRole[];
}
