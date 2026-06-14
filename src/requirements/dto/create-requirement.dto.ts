import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request body used to create a draft requirement.
 *
 * The selected category is the immutable classification input used for durable
 * visible-key allocation before the editable requirement text is persisted.
 */
export class CreateRequirementDto {
    @ApiProperty({ description: 'Internal project UUID.', format: 'uuid' })
    projectId!: string;

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
