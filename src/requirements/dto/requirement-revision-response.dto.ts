import { ApiProperty } from '@nestjs/swagger';

import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';

/**
 * Response returned for immutable requirement revision snapshots.
 *
 * Revisions preserve the prior requirement state captured before an edit,
 * rejection, or deletion transaction mutates the live requirement row.
 */
export class RequirementRevisionResponseDto {
    @ApiProperty({ description: 'Internal revision UUID.', format: 'uuid' })
    id!: string;
    @ApiProperty({ description: 'Requirement UUID.', format: 'uuid' })
    requirementId!: string;
    @ApiProperty({ description: 'Revision number scoped to the requirement.', minimum: 1 })
    revisionNumber!: number;
    @ApiProperty({ description: 'Visible key at snapshot time.', example: 'NFR-PERF-0001' })
    visibleKey!: string;
    @ApiProperty({ description: 'Requirement type at snapshot time.', enum: RequirementType })
    type!: RequirementType;
    @ApiProperty({ description: 'Category UUID at snapshot time.', format: 'uuid' })
    categoryId!: string;
    @ApiProperty({ description: 'Sequence number at snapshot time.', minimum: 1, maximum: 9999 })
    sequenceNumber!: number;
    @ApiProperty({ description: 'Lifecycle status at snapshot time.', enum: RequirementStatus })
    status!: RequirementStatus;
    @ApiProperty({ description: 'Requirement statement at snapshot time.' })
    description!: string;
    @ApiProperty({ description: 'Priority at snapshot time.' })
    priority!: string;
    @ApiProperty({ description: 'Owner at snapshot time.', nullable: true })
    owner!: string | null;
    @ApiProperty({ description: 'Rationale at snapshot time.', nullable: true })
    rationale!: string | null;
    @ApiProperty({ description: 'Source at snapshot time.', nullable: true })
    source!: string | null;
    @ApiProperty({ description: 'Rejection reason at snapshot time.', nullable: true })
    rejectionReason!: string | null;
    @ApiProperty({ description: 'Reviewer at snapshot time.', nullable: true })
    reviewer!: string | null;
    @ApiProperty({ description: 'Rejected timestamp at snapshot time.', nullable: true })
    rejectedAt!: string | null;
    @ApiProperty({ description: 'Deleted timestamp at snapshot time.', nullable: true })
    deletedAt!: string | null;
    @ApiProperty({ description: 'Original requirement creation timestamp.', format: 'date-time' })
    requirementCreatedAt!: string;
    @ApiProperty({ description: 'Requirement updated timestamp captured by the snapshot.', format: 'date-time' })
    requirementUpdatedAt!: string;
    @ApiProperty({ description: 'Revision row creation timestamp.', format: 'date-time' })
    createdAt!: string;
}
