import { ApiProperty } from '@nestjs/swagger';

export class CreateRequirementReviewCommentReplyDto {
    @ApiProperty({ example: 'The allowed methods are now listed in revision 2.' })
    text!: string;

    @ApiProperty({ example: 'Alice Requirements Engineer' })
    author!: string;
}
