import { ApiProperty } from '@nestjs/swagger';

export class RequirementReviewCommentReplyResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    commentId!: string;

    @ApiProperty()
    text!: string;

    @ApiProperty()
    author!: string;

    @ApiProperty()
    createdAt!: Date;
}
