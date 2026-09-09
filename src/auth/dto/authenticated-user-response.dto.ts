import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { AuthenticatedProjectMembershipDto } from "@/auth/dto/authenticated-project-membership.dto";

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

  @ApiPropertyOptional({
    type: AuthenticatedProjectMembershipDto,
    isArray: true,
  })
  projectMemberships?: AuthenticatedProjectMembershipDto[];
}
