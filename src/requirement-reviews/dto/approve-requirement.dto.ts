import { ApiProperty } from '@nestjs/swagger';

export class ApproveRequirementDto {
    @ApiProperty({ example: 'Jane Reviewer' })
    reviewer!: string;
}
