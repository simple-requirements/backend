import { ApiProperty } from '@nestjs/swagger';

export class RequirementRevisionDifferenceDto {
    @ApiProperty({ example: 'description' })
    field!: string;

    @ApiProperty({
        description: 'Value of the compared field in the source revision.',
        nullable: true,
        oneOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'array', items: {} },
            { type: 'object', additionalProperties: true },
        ],
    })
    from!: unknown;

    @ApiProperty({
        description: 'Value of the compared field in the target revision.',
        nullable: true,
        oneOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'array', items: {} },
            { type: 'object', additionalProperties: true },
        ],
    })
    to!: unknown;
}

export class RequirementRevisionComparisonDto {
    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2c' })
    projectId!: string;

    @ApiProperty({ example: '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b' })
    requirementId!: string;

    @ApiProperty({ example: 1 })
    fromRevision!: number;

    @ApiProperty({ example: 2 })
    toRevision!: number;

    @ApiProperty({ type: RequirementRevisionDifferenceDto, isArray: true })
    differences!: RequirementRevisionDifferenceDto[];
}
