import { ApiProperty } from '@nestjs/swagger';

export class CreateRequirementReviewCommentDto {
    @ApiProperty({ example: 'Please define the allowed authentication methods.' })
    text!: string;

    @ApiProperty({ example: 'Jane Reviewer' })
    author!: string;
}
