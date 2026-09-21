import { ApiProperty } from '@nestjs/swagger';

export class RejectRequirementDto {
    @ApiProperty({ example: 'Jane Reviewer' })
    reviewer!: string;

    @ApiProperty({ example: 'The requirement is ambiguous.' })
    rejectionReason!: string;
}
