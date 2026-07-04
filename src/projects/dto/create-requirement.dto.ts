import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRequirementDto {
    @ApiProperty({ example: '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d10', description: 'Owning category identifier.' })
    categoryId!: string;

    @ApiPropertyOptional({ example: 'Users must sign in with their username and password.', nullable: true })
    description?: string | null;

    @ApiPropertyOptional({ example: 'p1', enum: ['p1', 'p2', 'p3'], nullable: true })
    priority?: string | null;

    @ApiPropertyOptional({ example: 'Product Owner', nullable: true })
    owner?: string | null;

    @ApiPropertyOptional({ example: 'Required to protect project data.', nullable: true })
    rationale?: string | null;

    @ApiPropertyOptional({ example: 'Security workshop', nullable: true })
    source?: string | null;
}
