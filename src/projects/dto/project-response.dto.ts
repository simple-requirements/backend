import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectResponseDto {
    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b', description: 'Stable project identifier.' })
    id!: string;

    @ApiProperty({ example: 'Test project', description: 'Human-readable project name.' })
    name!: string;
    @ApiPropertyOptional({ example: 'https://github.com/xxx/{ticket-id}', nullable: true })
    ticketUrlTemplate!: string | null;

    @ApiProperty({ example: '2026-06-28T10:00:00.000Z', description: 'Date and time when the project was created.' })
    createdAt!: Date;

    @ApiProperty({
        example: '2026-06-28T10:00:00.000Z',
        description: 'Date and time when the project was last updated.',
    })
    updatedAt!: Date;
}
