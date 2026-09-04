import { ApiProperty } from "@nestjs/swagger";

import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { UserStatus } from "@/auth/accounts/user-status.enum";

export class UserAdministrationResponseDto {
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

  @ApiProperty({ format: "date-time", nullable: true })
  emailVerifiedAt!: Date | null;

  @ApiProperty({ enum: GlobalRole, isArray: true })
  globalRoles!: GlobalRole[];

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ format: "date-time" })
  updatedAt!: Date;
}
