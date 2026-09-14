import { ApiProperty } from "@nestjs/swagger";

export class AuthenticatedProjectMembershipDto {
  @ApiProperty({ format: "uuid" })
  projectId!: string;
}
