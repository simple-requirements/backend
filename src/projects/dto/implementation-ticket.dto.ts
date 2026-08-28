import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertImplementationTicketDto {
    @ApiProperty({ example: 'SOLAR-4711' })
    ticketId!: string;
    @ApiProperty({ example: 'Alex Developer' })
    completedBy!: string;
    @ApiProperty({ example: '2026-08-25', format: 'date' })
    completedAt!: string;
}

export class ImplementationTicketResponseDto extends UpsertImplementationTicketDto {
    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b' })
    id!: string;
    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2c' })
    requirementId!: string;
    @ApiPropertyOptional({ example: 'https://github.com/xxx/SOLAR-4711', nullable: true })
    url!: string | null;
    @ApiProperty({ example: '2026-08-25T10:00:00.000Z' })
    createdAt!: Date;
    @ApiProperty({ example: '2026-08-25T10:00:00.000Z' })
    updatedAt!: Date;
}
