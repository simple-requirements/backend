import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { METRIC_KEY_OPENAPI_PATTERN } from '@/metrics/metric-key';
export class CreateMetricDto {
    @ApiProperty({ pattern: METRIC_KEY_OPENAPI_PATTERN, example: 'MET-0001' }) key!: string;
    @ApiProperty({ example: '2000 ms' }) value!: string;
    @ApiProperty({ format: 'uuid' }) projectId!: string;
    @ApiPropertyOptional({ nullable: true, example: 'Max. latency' }) description?: string | null;
}
