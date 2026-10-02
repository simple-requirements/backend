import { ApiProperty } from '@nestjs/swagger';

export class CreateMetricDto {
    @ApiProperty({ example: '2000 ms', description: 'Non-empty metric value.' })
    value!: string;

    @ApiProperty({ example: 'Maximum acceptable response time.', description: 'Metric description.', required: false })
    description?: string;
}
