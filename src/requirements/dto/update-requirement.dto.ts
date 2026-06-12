import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request body used to edit draft requirement content.
 *
 * Classification, identity, status, visible-key, and sequence fields are absent
 * by design because those invariants cannot be changed through editing.
 */
export class UpdateRequirementDto {
    @ApiPropertyOptional({ description: 'Replacement requirement statement.' })
    description?: string;

    @ApiPropertyOptional({ description: 'Replacement priority label.', example: 'p1' })
    priority?: string;

    @ApiPropertyOptional({ description: 'Requirement owner; blank clears the value.', nullable: true })
    owner?: string | null;

    @ApiPropertyOptional({ description: 'Requirement rationale; blank clears the value.', nullable: true })
    rationale?: string | null;

    @ApiPropertyOptional({ description: 'Requirement source reference; blank clears the value.', nullable: true })
    source?: string | null;
}
