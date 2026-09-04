import { ApiProperty } from "@nestjs/swagger";
import { ProjectRole } from "@/auth/authorization/project-role.enum";

export class ProjectMembershipResponseDto {
  @ApiProperty({ format: "uuid" }) userId!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ enum: ProjectRole, isArray: true }) roles!: ProjectRole[];
}
