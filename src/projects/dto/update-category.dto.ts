import { ApiPropertyOptional } from '@nestjs/swagger';

import { CategoryType } from '@/projects/category-type.enum';

export class UpdateCategoryDto {
    @ApiPropertyOptional({ example: 'Authentication', description: 'Human-readable category name.' })
    name?: string;

    @ApiPropertyOptional({ example: 'AUTH', description: 'Uppercase category key used for visible requirement keys.' })
    key?: string;

    @ApiPropertyOptional({
        enum: CategoryType,
        example: CategoryType.FR,
        description: 'Requirement type handled by this category.',
    })
    type?: CategoryType;
}
