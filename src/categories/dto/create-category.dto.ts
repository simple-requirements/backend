import { ApiProperty } from '@nestjs/swagger';

/**
 * Request body used to create a category.
 *
 * Category keys are durable visible-key segments, so validation keeps them
 * uppercase and stable before requirements can reference the category.
 */
export class CreateCategoryDto {
    @ApiProperty({ description: 'Human-readable category name.', example: 'Performance' })
    name!: string;

    @ApiProperty({ description: 'Uppercase category key used in visible requirement keys.', example: 'PERF' })
    key!: string;
}
