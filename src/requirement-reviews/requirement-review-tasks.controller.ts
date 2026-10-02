import type { AuthenticatedRequest } from '@/auth/sessions/authenticated-request';
import { ProjectAuthorizationGuard } from '@/auth/authorization/project-authorization.guard';
import { ProjectPermission, RequireProjectPermission } from '@/auth/authorization/project-permission';
import { SessionAuthGuard } from '@/auth/sessions/session-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import {
    AssignRequirementReviewTaskDto,
    RequirementReviewAssigneeDto,
    RequirementReviewTaskResponseDto,
    UpdateRequirementReviewTaskDto,
} from '@/requirement-reviews/dto/requirement-review-task.dto';
import {
    assignRequirementReviewTaskSchema,
    updateRequirementReviewTaskSchema,
} from '@/requirement-reviews/dto/requirement-review-task.schemas';
import { RequirementReviewTasksService } from '@/requirement-reviews/requirement-review-tasks.service';
import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

@ApiTags('requirement review tasks')
@ApiBearerAuth()
@Controller('projects/:projectId')
@UseGuards(SessionAuthGuard, ProjectAuthorizationGuard)
export class RequirementReviewTasksController {
    constructor(private readonly reviewTasks: RequirementReviewTasksService) {}

    @Get('review-assignees')
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({ operationId: 'listReviewAssignees', summary: 'List eligible review-task assignees.' })
    @ApiOkResponse({ type: RequirementReviewAssigneeDto, isArray: true })
    listAssignees(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest) {
        return this.reviewTasks.listEligibleAssignees(projectId, request.authentication.user.id);
    }

    @Get('review-tasks')
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({ operationId: 'listMyReviewTasks', summary: 'List the signed-in engineer review tasks.' })
    @ApiOkResponse({ type: RequirementReviewTaskResponseDto, isArray: true })
    listMine(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest) {
        return this.reviewTasks.listMine(projectId, request.authentication.user.id);
    }

    @Get('requirements/:requirementId/review-tasks')
    @RequireProjectPermission(ProjectPermission.Read)
    @ApiOperation({ operationId: 'listRequirementReviewTasks', summary: 'List review tasks for a requirement.' })
    @ApiOkResponse({ type: RequirementReviewTaskResponseDto, isArray: true })
    @ApiNotFoundResponse({ description: 'The requirement was not found.' })
    listForRequirement(@Param('projectId') projectId: string, @Param('requirementId') requirementId: string) {
        return this.reviewTasks.listForRequirement(projectId, requirementId);
    }

    @Post('requirements/:requirementId/review-tasks')
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({ operationId: 'assignRequirementReviewTask', summary: 'Assign a review task.' })
    @ApiCreatedResponse({ type: RequirementReviewTaskResponseDto })
    @ApiBadRequestResponse({ description: 'The assignment is invalid.' })
    assign(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Body(new ZodValidationPipe(assignRequirementReviewTaskSchema)) dto: AssignRequirementReviewTaskDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.reviewTasks.assign(projectId, requirementId, dto, request.authentication.user.id);
    }

    @Patch('requirements/:requirementId/review-tasks/:taskId')
    @RequireProjectPermission(ProjectPermission.ManageRequirements)
    @ApiOperation({
        operationId: 'updateRequirementReviewTask',
        summary: 'Update the status of an assigned review task.',
    })
    @ApiOkResponse({ type: RequirementReviewTaskResponseDto })
    @ApiBadRequestResponse({ description: 'The status transition is invalid.' })
    @ApiForbiddenResponse({ description: 'Only the assignee can update this task.' })
    @ApiNotFoundResponse({ description: 'The task was not found.' })
    updateStatus(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Param('taskId') taskId: string,
        @Body(new ZodValidationPipe(updateRequirementReviewTaskSchema)) dto: UpdateRequirementReviewTaskDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.reviewTasks.updateStatus(projectId, requirementId, taskId, dto, request.authentication.user.id);
    }
}
