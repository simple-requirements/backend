import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequirementMetricReferenceDto {
    @ApiProperty({ example: 'MET-0001', description: 'Metric key exactly as referenced by the requirement.' })
    key!: string;

    @ApiPropertyOptional({
        example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b',
        nullable: true,
        description: 'Stable internal metric identifier when the reference resolves.',
    })
    metricId!: string | null;

    @ApiPropertyOptional({
        example: '2000 ms',
        nullable: true,
        description: 'Current metric value when the reference resolves.',
    })
    value!: string | null;

    @ApiProperty({ example: true, description: 'Whether the referenced metric exists in the same project.' })
    resolved!: boolean;

    @ApiPropertyOptional({
        example: true,
        nullable: true,
        description: 'Current active state when the referenced metric resolves.',
    })
    active!: boolean | null;
}
