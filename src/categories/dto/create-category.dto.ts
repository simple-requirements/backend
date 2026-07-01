import { ApiProperty } from '@nestjs/swagger';

import { RequirementType } from '@/requirements/requirement-type.enum';

export class CreateCategoryDto {
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
}
