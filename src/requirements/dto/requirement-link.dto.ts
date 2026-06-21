import { ApiProperty } from '@nestjs/swagger';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { RequirementLinkRelationshipType } from '@/requirements/requirement-link.entity';

export class RequirementLinkTargetDto {
    @ApiProperty({
        format: 'uuid',
        required: false,
        description: 'Internal target requirement UUID. Mutually exclusive with targetVisibleKey.',
    })
    targetRequirementId?: string;

    @ApiProperty({
        example: 'NFR-PERF-0001',
        required: false,
        description: 'Visible target requirement key. Mutually exclusive with targetRequirementId.',
    })
    targetVisibleKey?: string;
}

export class RequirementLinkResponseDto {
    @ApiProperty({ format: 'uuid' }) id!: string;
    @ApiProperty({ format: 'uuid' }) projectId!: string;
    @ApiProperty({ enum: RequirementLinkRelationshipType, example: RequirementLinkRelationshipType.References })
    relationshipType!: RequirementLinkRelationshipType;
    @ApiProperty({ format: 'uuid' }) sourceRequirementId!: string;
    @ApiProperty({ example: 'FR-DATA-0001' }) sourceVisibleKey!: string;
    @ApiProperty({ enum: RequirementType }) sourceType!: RequirementType;
    @ApiProperty({ format: 'uuid' }) sourceCategoryId!: string;
    @ApiProperty({ required: false, example: 'DATA' }) sourceCategoryKey?: string;
    @ApiProperty({ enum: RequirementStatus }) sourceStatus!: RequirementStatus;
    @ApiProperty({ format: 'uuid' }) targetRequirementId!: string;
    @ApiProperty({ example: 'NFR-PERF-0001' }) targetVisibleKey!: string;
    @ApiProperty({ enum: RequirementType }) targetType!: RequirementType;
    @ApiProperty({ format: 'uuid' }) targetCategoryId!: string;
    @ApiProperty({ required: false, example: 'PERF' }) targetCategoryKey?: string;
    @ApiProperty({ enum: RequirementStatus }) targetStatus!: RequirementStatus;
    @ApiProperty({ format: 'date-time' }) createdAt!: string;
    @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
