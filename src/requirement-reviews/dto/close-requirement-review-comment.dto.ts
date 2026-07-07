import { ApiProperty } from '@nestjs/swagger';

export class CloseRequirementReviewCommentDto {
    @ApiProperty({ example: 'Jane Reviewer' })
    closedBy!: string;
}
