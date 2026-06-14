import { ApiProperty } from '@nestjs/swagger';

/** Request body used to create a project. */
export class CreateProjectDto {
    @ApiProperty({ description: 'Project name.', example: 'Product A' })
    name!: string;
}
