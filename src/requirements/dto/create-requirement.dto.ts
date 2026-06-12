import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { RequirementType } from '@/requirements/requirement-type-enum';

/**
 * Request body used to create a draft requirement.
 *
 * The type and category are immutable classification inputs used for durable
 * visible-key allocation before the editable requirement text is persisted.
 */
export class CreateRequirementDto {
    @ApiProperty({
        description: 'Requirement type used as the visible-key prefix.',
        enum: RequirementType,
        example: RequirementType.NFR,
    })
    type!: RequirementType;

    @ApiProperty({ description: 'Internal category UUID.', format: 'uuid' })
    categoryId!: string;

    @ApiProperty({ description: 'Requirement behavior or constraint statement.' })
    description!: string;

    @ApiProperty({ description: 'Priority label.', example: 'p3' })
    priority!: string;

    @ApiPropertyOptional({ description: 'Requirement owner.', nullable: true, example: 'Platform Team' })
    owner?: string | null;

    @ApiPropertyOptional({ description: 'Requirement rationale.', nullable: true })
    rationale?: string | null;

    @ApiPropertyOptional({ description: 'Requirement source reference.', nullable: true, example: 'US-REQ-001' })
    source?: string | null;
}
