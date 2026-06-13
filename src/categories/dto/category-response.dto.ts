import { RequirementType } from '@/requirements/requirement-type-enum';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Response returned for persisted categories.
 *
 * The DTO belongs to the HTTP contract and exposes timestamps as ISO strings
 * rather than database Date objects.
 */
export class CategoryResponseDto {
    @ApiProperty({ description: 'Internal category UUID.', format: 'uuid' })
    id!: string;

    @ApiProperty({ description: 'Human-readable category name.', example: 'Performance' })
    name!: string;

    @ApiProperty({ description: 'Uppercase category key.', example: 'PERF' })
    key!: string;

    @ApiProperty({ description: 'Requirement type derived from this category.', enum: RequirementType })
    type!: RequirementType;

    @ApiProperty({ description: 'ISO timestamp when the category was created.', format: 'date-time' })
    createdAt!: string;

    @ApiProperty({ description: 'ISO timestamp when the category was last updated.', format: 'date-time' })
    updatedAt!: string;
}
