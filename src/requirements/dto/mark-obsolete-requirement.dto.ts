import { ApiProperty } from '@nestjs/swagger';

/**
 * Request body for marking an approved or rejected requirement obsolete.
 */
export class MarkObsoleteRequirementDto {
    @ApiProperty({ description: 'Reason the requirement is obsolete.', example: 'Superseded by NFR-PERF-0002.' })
    obsolescenceReason!: string;
}
