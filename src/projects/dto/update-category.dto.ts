import { ApiPropertyOptional } from '@nestjs/swagger';

import { RequirementType } from '@/requirements/requirement-type.enum';

export class UpdateCategoryDto {
    @ApiPropertyOptional({ example: 'Authentication', description: 'Human-readable category name.' })
    name?: string;

    @ApiPropertyOptional({ example: 'AUTH', description: 'Uppercase category key used for visible requirement keys.' })
    key?: string;

    @ApiPropertyOptional({
        enum: RequirementType,
        example: RequirementType.FR,
        description: 'Requirement type handled by this category.',
    })
    type?: RequirementType;
}
