import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { RequirementReviewTaskStatus } from '@/requirement-reviews/requirement-review-task-status.enum';

export class RequirementReviewAssigneeDto {
    @ApiProperty({ format: 'uuid' })
    userId!: string;

    @ApiProperty()
    username!: string;

    @ApiProperty()
    displayName!: string;
}

export class RequirementReviewTaskResponseDto {
    @ApiProperty({ format: 'uuid' })
    id!: string;

    @ApiProperty({ format: 'uuid' })
    projectId!: string;

    @ApiProperty({ format: 'uuid' })
    requirementId!: string;

    @ApiProperty()
    requirementKey!: string;

    @ApiPropertyOptional({ nullable: true })
    requirementDescription!: string | null;

    @ApiProperty({ enum: RequirementReviewTaskStatus })
    status!: RequirementReviewTaskStatus;

    @ApiProperty({ type: RequirementReviewAssigneeDto })
    assignee!: RequirementReviewAssigneeDto;

    @ApiProperty({ type: RequirementReviewAssigneeDto })
    assignedBy!: RequirementReviewAssigneeDto;

    @ApiProperty({ format: 'date-time' })
    createdAt!: Date;

    @ApiProperty({ format: 'date-time' })
    updatedAt!: Date;

    @ApiPropertyOptional({ format: 'date-time', nullable: true })
    completedAt!: Date | null;
}

export class AssignRequirementReviewTaskDto {
    @ApiProperty({ format: 'uuid' })
    assigneeUserId!: string;
}

export class UpdateRequirementReviewTaskDto {
    @ApiProperty({ enum: RequirementReviewTaskStatus })
    status!: RequirementReviewTaskStatus;
}
