import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
    @ApiPropertyOptional({ example: 'Renamed project', description: 'New human-readable project name.' })
    name?: string;
    @ApiPropertyOptional({ example: 'https://github.com/xxx/{ticket-id}', nullable: true })
    ticketUrlTemplate?: string | null;
}
