import { ApiProperty } from "@nestjs/swagger";

import { UserStatus } from "@/auth/accounts/user-status.enum";

export class UpdateUserStatusDto {
  @ApiProperty({ enum: [UserStatus.Active, UserStatus.Deactivated] })
  status!: UserStatus.Active | UserStatus.Deactivated;
}
