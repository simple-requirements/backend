import { ApiProperty } from '@nestjs/swagger';

/** Response returned for project summary/detail operations. */
export class ProjectResponseDto {
    @ApiProperty({ description: 'Internal project UUID.', format: 'uuid' })
    id!: string;

    @ApiProperty({ description: 'Project name.', example: 'Product A' })
    name!: string;

    @ApiProperty({ description: 'Number of non-deleted requirements in the project.', minimum: 0 })
    requirementCount!: number;

    @ApiProperty({ description: 'ISO timestamp when created.', format: 'date-time' })
    createdAt!: string;

    @ApiProperty({ description: 'ISO timestamp when last updated.', format: 'date-time' })
    updatedAt!: string;
}
