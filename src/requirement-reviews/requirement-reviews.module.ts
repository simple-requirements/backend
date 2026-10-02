import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Requirement } from '@/projects/requirements.entity';
import { ProjectsModule } from '@/projects/projects.module';
import { RequirementReviewComment } from '@/requirement-reviews/requirement-review-comment.entity';
import { RequirementReviewCommentReply } from '@/requirement-reviews/requirement-review-comment-reply.entity';
import { ProjectMembership } from '@/auth/authorization/project-membership.entity';
import { RequirementReviewTask } from '@/requirement-reviews/requirement-review-task.entity';
import { RequirementReviewTasksController } from '@/requirement-reviews/requirement-review-tasks.controller';
import { RequirementReviewTasksService } from '@/requirement-reviews/requirement-review-tasks.service';
import { RequirementReviewsController } from '@/requirement-reviews/requirement-reviews.controller';
import { RequirementReviewsService } from '@/requirement-reviews/requirement-reviews.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
    imports: [
        AuthModule,
        ProjectsModule,
        TypeOrmModule.forFeature([
            Requirement,
            RequirementReviewComment,
            RequirementReviewCommentReply,
            RequirementReviewTask,
            ProjectMembership,
        ]),
    ],
    controllers: [RequirementReviewsController, RequirementReviewTasksController],
    providers: [RequirementReviewsService, RequirementReviewTasksService],
})
// NestJS module classes are intentionally declarative and have no members.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RequirementReviewsModule {}
