import { ApiProperty } from '@nestjs/swagger';

import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';

/**
 * Response returned for current requirement state.
 *
 * The DTO exposes durable identity and visible-key fields together with editable
 * draft content and nullable lifecycle metadata as ISO strings.
 */
export class RequirementResponseDto {
    @ApiProperty({ description: 'Internal requirement UUID.', format: 'uuid' })
    id!: string;
    @ApiProperty({
        description: 'Visible requirement key whose prefix is derived from the assigned category type.',
        example: 'NFR-PERF-0001',
    })
    visibleKey!: string;
    @ApiProperty({
        description: 'Read-only requirement type derived from the assigned category.',
        enum: RequirementType,
    })
    type!: RequirementType;
    @ApiProperty({ description: 'Project UUID.', format: 'uuid' })
    projectId!: string;
    @ApiProperty({ description: 'Category UUID.', format: 'uuid' })
    categoryId!: string;
    @ApiProperty({ description: 'Category-scoped sequence number.', minimum: 1, maximum: 9999 })
    sequenceNumber!: number;
    @ApiProperty({ description: 'Requirement lifecycle status.', enum: RequirementStatus })
    status!: RequirementStatus;
    @ApiProperty({ description: 'Requirement statement.' })
    description!: string;
    @ApiProperty({ description: 'Priority label.', example: 'p3' })
    priority!: string;
    @ApiProperty({ description: 'Requirement owner.', nullable: true })
    owner!: string | null;
    @ApiProperty({ description: 'Requirement rationale.', nullable: true })
    rationale!: string | null;
    @ApiProperty({ description: 'Requirement source reference.', nullable: true })
    source!: string | null;
    @ApiProperty({ description: 'Rejection reason when rejected.', nullable: true })
    rejectionReason!: string | null;
    @ApiProperty({ description: 'Reviewer when rejected.', nullable: true })
    reviewer!: string | null;
    @ApiProperty({ description: 'ISO timestamp when rejected.', format: 'date-time', nullable: true })
    rejectedAt!: string | null;
    @ApiProperty({ description: 'ISO timestamp when deleted.', format: 'date-time', nullable: true })
    deletedAt!: string | null;
    @ApiProperty({ description: 'ISO timestamp when approved.', format: 'date-time', nullable: true })
    approvedAt!: string | null;
    @ApiProperty({ description: 'ISO timestamp when implemented.', format: 'date-time', nullable: true })
    implementedAt!: string | null;
    @ApiProperty({ description: 'Obsolescence reason when obsolete.', nullable: true })
    obsolescenceReason!: string | null;
    @ApiProperty({ description: 'ISO timestamp when obsolete.', format: 'date-time', nullable: true })
    obsoleteAt!: string | null;
    @ApiProperty({ description: 'ISO timestamp when created.', format: 'date-time' })
    createdAt!: string;
    @ApiProperty({ description: 'ISO timestamp when last updated.', format: 'date-time' })
    updatedAt!: string;
}
