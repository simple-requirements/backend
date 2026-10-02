import { ApiProperty } from '@nestjs/swagger';

import { CategoryType } from '@/projects/category-type.enum';
import { VISIBLE_KEY_OPENAPI_PATTERN } from '@/projects/requirement.constants';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import { REQUIREMENT_LINK_RELATIONSHIP } from '@/projects/requirement-links.entity';

export class RequirementLinkEndpointDto {
    @ApiProperty({ format: 'uuid' })
    requirementId!: string;

    @ApiProperty({ example: 'FR-AUTH-0001', pattern: VISIBLE_KEY_OPENAPI_PATTERN })
    visibleKey!: string;

    @ApiProperty({ enum: CategoryType })
    type!: CategoryType;

    @ApiProperty({ format: 'uuid' })
    categoryId!: string;

    @ApiProperty({ example: 'Authentication' })
    categoryName!: string;

    @ApiProperty({ enum: RequirementStatus })
    status!: RequirementStatus;
}

export class RequirementLinkResponseDto {
    @ApiProperty({ format: 'uuid' })
    id!: string;

    @ApiProperty({ format: 'uuid' })
    projectId!: string;

    @ApiProperty({ enum: [REQUIREMENT_LINK_RELATIONSHIP], example: REQUIREMENT_LINK_RELATIONSHIP })
    relationshipType!: typeof REQUIREMENT_LINK_RELATIONSHIP;

    @ApiProperty({ type: RequirementLinkEndpointDto })
    source!: RequirementLinkEndpointDto;

    @ApiProperty({ type: RequirementLinkEndpointDto })
    target!: RequirementLinkEndpointDto;

    @ApiProperty({ example: '2026-10-02T08:00:00.000Z' })
    createdAt!: Date;

    @ApiProperty({ example: '2026-10-02T08:00:00.000Z' })
    updatedAt!: Date;
}

export class RequirementLinksOverviewDto {
    @ApiProperty({ type: RequirementLinkResponseDto, isArray: true })
    outgoing!: RequirementLinkResponseDto[];

    @ApiProperty({ type: RequirementLinkResponseDto, isArray: true })
    incoming!: RequirementLinkResponseDto[];
}

export class CreateRequirementLinkDto {
    @ApiProperty({
        example: 'NFR-PERF-0005',
        description: 'Visible key of the target requirement.',
        pattern: VISIBLE_KEY_OPENAPI_PATTERN,
    })
    targetKey!: string;
}

export class UpdateRequirementLinkDto {
    @ApiProperty({
        example: 'FR-DATA-0015',
        description: 'Visible key of the corrected target requirement.',
        pattern: VISIBLE_KEY_OPENAPI_PATTERN,
    })
    targetKey!: string;
}
