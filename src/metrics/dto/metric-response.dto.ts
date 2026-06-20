import { ApiProperty } from '@nestjs/swagger';
import { METRIC_KEY_OPENAPI_PATTERN } from '@/metrics/metric-key';
export class MetricResponseDto {
    @ApiProperty({ format: 'uuid' }) id!: string;
    @ApiProperty({ format: 'uuid' }) projectId!: string;
    @ApiProperty({ pattern: METRIC_KEY_OPENAPI_PATTERN, example: 'MET-0001' }) key!: string;
    @ApiProperty({ example: '2000 ms' }) value!: string;
    @ApiProperty({ nullable: true, example: 'Max. latency' }) description!: string | null;
    @ApiProperty({ format: 'date-time' }) createdAt!: string;
    @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
