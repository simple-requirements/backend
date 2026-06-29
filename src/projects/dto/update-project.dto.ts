import { ApiProperty } from '@nestjs/swagger';

export class UpdateProjectDto {
    @ApiProperty({ example: 'Renamed project', description: 'New human-readable project name.' })
    name!: string;
}
