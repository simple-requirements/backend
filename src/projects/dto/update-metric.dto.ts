import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMetricDto {
    @ApiPropertyOptional({ example: '1000 ms', description: 'Non-empty metric value.' })
    value?: string;

    @ApiPropertyOptional({ example: 'Updated response-time target.', description: 'Metric description.' })
    description?: string;
}
