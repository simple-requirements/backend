import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Requirement } from "@/projects/requirements.entity";
import { ProjectsModule } from "@/projects/projects.module";
import { RequirementReviewComment } from "@/requirement-reviews/requirement-review-comment.entity";
import { RequirementReviewCommentReply } from "@/requirement-reviews/requirement-review-comment-reply.entity";
import { RequirementReviewsController } from "@/requirement-reviews/requirement-reviews.controller";
import { RequirementReviewsService } from "@/requirement-reviews/requirement-reviews.service";
import { AuthModule } from "@/auth/auth.module";

@Module({
  imports: [
    AuthModule,
    ProjectsModule,
    TypeOrmModule.forFeature([
      Requirement,
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
