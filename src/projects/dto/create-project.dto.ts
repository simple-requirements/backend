import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
    @ApiProperty({ example: 'Test project', description: 'Human-readable project name.' })
    name!: string;
}
