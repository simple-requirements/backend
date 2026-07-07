import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RequirementRevision } from '@/projects/requirement-revisions.entity';
import { Requirement } from '@/projects/requirements.entity';
import { RequirementReviewComment } from '@/requirement-reviews/requirement-review-comment.entity';
import { RequirementReviewsController } from '@/requirement-reviews/requirement-reviews.controller';
import { RequirementReviewsService } from '@/requirement-reviews/requirement-reviews.service';

@Module({
    imports: [TypeOrmModule.forFeature([Requirement, RequirementRevision, RequirementReviewComment])],
    controllers: [RequirementReviewsController],
    providers: [RequirementReviewsService],
})
export class RequirementReviewsModule {}
