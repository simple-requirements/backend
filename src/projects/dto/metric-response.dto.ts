import { ApiProperty } from '@nestjs/swagger';

export class MetricResponseDto {
    @ApiProperty({ description: 'Stable internal metric identifier.' }) id!: string;
    @ApiProperty({ description: 'Owning project identifier.' }) projectId!: string;
    @ApiProperty({ example: 'MET-0001', description: 'Immutable project-scoped generated metric key.' }) key!: string;
    @ApiProperty({ example: '2000 ms', description: 'Metric value.' }) value!: string;
    @ApiProperty({ example: 'Maximum acceptable response time.', description: 'Metric description.' }) description!: string;
    @ApiProperty({ description: 'Whether the metric is active.' }) active!: boolean;
    @ApiProperty() createdAt!: Date;
    @ApiProperty() updatedAt!: Date;
}
