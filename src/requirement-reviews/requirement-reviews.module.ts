import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RequirementRevision } from '@/projects/requirement-revisions.entity';
import { Requirement } from '@/projects/requirements.entity';
import { RequirementReviewComment } from '@/requirement-reviews/requirement-review-comment.entity';
import { RequirementReviewCommentReply } from '@/requirement-reviews/requirement-review-comment-reply.entity';
import { RequirementReviewsController } from '@/requirement-reviews/requirement-reviews.controller';
import { RequirementReviewsService } from '@/requirement-reviews/requirement-reviews.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Requirement,
            RequirementRevision,
            RequirementReviewComment,
            RequirementReviewCommentReply,
        ]),
    ],
    controllers: [RequirementReviewsController],
    providers: [RequirementReviewsService],
})
// NestJS module classes are intentionally declarative and have no members.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RequirementReviewsModule {}
