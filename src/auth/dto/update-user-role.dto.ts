import { ApiProperty } from "@nestjs/swagger";

import { AccountRole } from "@/auth/accounts/account-role.enum";

export class UpdateUserRoleDto {
  @ApiProperty({ enum: AccountRole })
  role!: AccountRole;
}
