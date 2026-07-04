import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { VISIBLE_KEY_OPENAPI_PATTERN } from '@/projects/requirement.constants';
import { RequirementStatus } from '@/projects/requirement-status.enum';

export class RequirementResponseDto {
    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b', description: 'Stable requirement identifier.' })
    id!: string;

    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2c', description: 'Owning project identifier.' })
    projectId!: string;

    @ApiProperty({ example: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d10', description: 'Owning category identifier.' })
    categoryId!: string;

    @ApiProperty({ example: 1, description: 'Sequential number within the category used to build the visible key.' })
    sequenceNumber!: number;

    @ApiProperty({ example: 'FR-AUTH-0001', pattern: VISIBLE_KEY_OPENAPI_PATTERN })
    visibleKey!: string;

    @ApiProperty({ example: 1, description: 'Current revision number of this requirement.' })
    revisionNumber!: number;

    @ApiProperty({ enum: RequirementStatus, example: RequirementStatus.Draft })
    status!: RequirementStatus;

    @ApiPropertyOptional({ example: 'Users must sign in with their username and password.', nullable: true })
    description!: string | null;

    @ApiPropertyOptional({ example: 'p1', enum: ['p1', 'p2', 'p3'], nullable: true })
    priority!: string | null;

    @ApiPropertyOptional({ example: 'Product Owner', nullable: true })
    owner!: string | null;

    @ApiPropertyOptional({ example: 'Required to protect project data.', nullable: true })
    rationale!: string | null;

    @ApiPropertyOptional({ example: 'Security workshop', nullable: true })
    source!: string | null;

    @ApiPropertyOptional({ example: 'The requirement is ambiguous.', nullable: true })
    rejectionReason!: string | null;

    @ApiPropertyOptional({ example: 'Jane Reviewer', nullable: true })
    reviewer!: string | null;

    @ApiPropertyOptional({ example: '2026-06-28T10:00:00.000Z', nullable: true })
    rejectedAt!: Date | null;

    @ApiPropertyOptional({ example: '2026-06-28T10:00:00.000Z', nullable: true })
    deletedAt!: Date | null;

    @ApiPropertyOptional({ example: '2026-06-28T10:00:00.000Z', nullable: true })
    approvedAt!: Date | null;

    @ApiPropertyOptional({ example: '2026-06-28T10:00:00.000Z', nullable: true })
    implementedAt!: Date | null;

    @ApiPropertyOptional({ example: 'Superseded by a newer authentication concept.', nullable: true })
    obsolescenceReason!: string | null;

    @ApiPropertyOptional({ example: '2026-06-28T10:00:00.000Z', nullable: true })
    obsoleteAt!: Date | null;

    @ApiProperty({ example: '2026-06-28T10:00:00.000Z', description: 'Date and time when the requirement was created.' })
    createdAt!: Date;

    @ApiProperty({ example: '2026-06-28T10:00:00.000Z', description: 'Date and time when the requirement was last updated.' })
    updatedAt!: Date;
}
