import { ApiProperty } from '@nestjs/swagger';

import { RequirementType } from '@/requirements/requirement-type-enum';

/**
 * Internal DTO returned by visible-key allocation.
 *
 * The allocator persists the requirement identity and returns the reserved key
 * material so the requirement service can fill editable draft fields in the
 * surrounding creation transaction without recalculating key material.
 */
export class AllocatedRequirementKeyDto {
    @ApiProperty({ description: 'Persisted internal requirement UUID.', format: 'uuid' })
    id!: string;

    @ApiProperty({ description: 'Requirement type prefix.', enum: RequirementType, example: RequirementType.NFR })
    type!: RequirementType;

    @ApiProperty({ description: 'Category UUID.', format: 'uuid' })
    categoryId!: string;

    @ApiProperty({ description: 'Allocated sequence number.', minimum: 1, maximum: 9999 })
    sequenceNumber!: number;

    @ApiProperty({ description: 'Allocated visible key.', example: 'NFR-PERF-0001' })
    visibleKey!: string;
}
