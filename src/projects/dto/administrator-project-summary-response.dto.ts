import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ProjectMembershipResponseDto } from "@/auth/dto/project-membership-response.dto";

export class AdministratorProjectSummaryResponseDto {
  @ApiProperty({
    example: "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b",
    description: "Stable project identifier.",
  })
  id!: string;

  @ApiProperty({
    example: "Test project",
    description: "Human-readable project name.",
  })
  name!: string;

  @ApiProperty({
    example: ["Authentication", "Reporting"],
    description:
      "Category names exposed as administrative summary metadata. Category details are not included.",
    type: String,
    isArray: true,
  })
  categoryNames!: string[];

  @ApiProperty({ example: 2, minimum: 0 })
  categoryCount!: number;

  @ApiProperty({ example: 17, minimum: 0 })
  requirementCount!: number;

  @ApiProperty({ type: ProjectMembershipResponseDto, isArray: true })
  memberships!: ProjectMembershipResponseDto[];

  @ApiPropertyOptional({
    example: "https://github.com/acme/issues/{ticket-id}",
    nullable: true,
    description: "Administrative implementation-ticket URL template.",
  })
  ticketUrlTemplate!: string | null;

  @ApiProperty({ example: "2026-06-28T10:00:00.000Z" })
  createdAt!: Date;

  @ApiProperty({ example: "2026-06-28T10:00:00.000Z" })
  updatedAt!: Date;
}
