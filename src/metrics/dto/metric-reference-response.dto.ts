import { ApiProperty } from '@nestjs/swagger';
import { METRIC_KEY_OPENAPI_PATTERN } from '@/metrics/metric-key';
export class MetricReferenceResponseDto {
    @ApiProperty({ format: 'uuid', nullable: true }) id!: string | null;
    @ApiProperty({ pattern: METRIC_KEY_OPENAPI_PATTERN, example: 'MET-0001' }) key!: string;
    @ApiProperty({ example: '2000 ms', nullable: true }) value!: string | null;
    @ApiProperty({ nullable: true }) description!: string | null;
    @ApiProperty({ description: 'Whether the metric reference resolved within the requirement project.' })
    resolved!: boolean;
}
