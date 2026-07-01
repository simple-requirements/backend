import { ApiProperty } from '@nestjs/swagger';

import { RequirementType } from '@/requirements/requirement-type.enum';

export class CategoryResponseDto {
    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b', description: 'Stable category identifier.' })
    id!: string;

    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2c', description: 'Owning project identifier.' })
    projectId!: string;

    @ApiProperty({ example: 'Authentication', description: 'Human-readable category name.' })
    name!: string;

    @ApiProperty({ example: 'AUTH', description: 'Uppercase category key used for visible requirement keys.' })
    key!: string;

    @ApiProperty({
        enum: RequirementType,
        example: RequirementType.FR,
        description: 'Requirement type handled by this category.',
    })
    type!: RequirementType;

    @ApiProperty({ example: '2026-06-28T10:00:00.000Z', description: 'Date and time when the category was created.' })
    createdAt!: Date;

    @ApiProperty({
        example: '2026-06-28T10:00:00.000Z',
        description: 'Date and time when the category was last updated.',
    })
    updatedAt!: Date;
}
