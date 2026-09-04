import { ApiProperty } from "@nestjs/swagger";
import { ProjectRole } from "@/auth/authorization/project-role.enum";

export class SetProjectMembershipDto {
  @ApiProperty({ enum: ProjectRole, isArray: true }) roles!: ProjectRole[];
}
