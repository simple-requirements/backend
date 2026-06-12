import { ApiProperty } from '@nestjs/swagger';

/**
 * Request body used to reject a draft requirement.
 *
 * Rejection metadata is persisted with the lifecycle transition and appears in
 * revision snapshots and explicit requirement lookups.
 */
export class RejectRequirementDto {
    @ApiProperty({ description: 'Reason the draft requirement was rejected.' })
    rejectionReason!: string;

    @ApiProperty({ description: 'Reviewer who rejected the draft.', example: 'QA Lead' })
    reviewer!: string;
}
