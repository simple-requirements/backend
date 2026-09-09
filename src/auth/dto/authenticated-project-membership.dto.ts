import { ApiProperty } from "@nestjs/swagger";

import { ProjectRole } from "@/auth/authorization/project-role.enum";

export class AuthenticatedProjectMembershipDto {
  @ApiProperty({ format: "uuid" })
  projectId!: string;

  @ApiProperty({ enum: ProjectRole, isArray: true })
  roles!: ProjectRole[];
}
