import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { RequirementResponseDto } from '@/projects/dto/requirement-response.dto';
import { ApproveRequirementDto } from '@/requirement-reviews/dto/approve-requirement.dto';
import { CloseRequirementReviewCommentDto } from '@/requirement-reviews/dto/close-requirement-review-comment.dto';
import { CreateRequirementReviewCommentDto } from '@/requirement-reviews/dto/create-requirement-review-comment.dto';
import { RejectRequirementDto } from '@/requirement-reviews/dto/reject-requirement.dto';
import { RequirementReviewCommentResponseDto } from '@/requirement-reviews/dto/requirement-review-comment-response.dto';
import {
    approveRequirementSchema,
    closeRequirementReviewCommentSchema,
    createRequirementReviewCommentSchema,
    rejectRequirementSchema,
} from '@/requirement-reviews/dto/requirement-review.schemas';
import { RequirementReviewsService } from '@/requirement-reviews/requirement-reviews.service';

@ApiTags('requirement reviews')
@Controller('projects/:projectId/requirements/:requirementId')
export class RequirementReviewsController {
    constructor(private readonly requirementReviewsService: RequirementReviewsService) {}

    @Get('review-comments')
    @ApiOperation({ operationId: 'listRequirementReviewComments', summary: 'List review comments of a requirement.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Requirement identifier.' })
    @ApiOkResponse({
        description: 'All review comments of the requirement.',
        type: RequirementReviewCommentResponseDto,
        isArray: true,
    })
    @ApiNotFoundResponse({ description: 'The requirement was not found.' })
    async findAllReviewComments(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
    ): Promise<RequirementReviewCommentResponseDto[]> {
        return this.requirementReviewsService.findAllReviewComments(projectId, requirementId);
    }

    @Post('review-comments')
    @ApiOperation({ operationId: 'createRequirementReviewComment', summary: 'Create a review comment.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Requirement identifier.' })
    @ApiCreatedResponse({ description: 'The review comment was created.', type: RequirementReviewCommentResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid or the requirement cannot be reviewed.' })
    @ApiNotFoundResponse({ description: 'The requirement was not found.' })
    async createReviewComment(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Body(new ZodValidationPipe(createRequirementReviewCommentSchema))
        createCommentDto: CreateRequirementReviewCommentDto,
    ): Promise<RequirementReviewCommentResponseDto> {
        return this.requirementReviewsService.createReviewComment(projectId, requirementId, createCommentDto);
    }

    @Patch('review-comments/:commentId')
    @ApiOperation({ operationId: 'closeRequirementReviewComment', summary: 'Close a review comment.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Requirement identifier.' })
    @ApiParam({ name: 'commentId', description: 'Review comment identifier.' })
    @ApiOkResponse({ description: 'The review comment was closed.', type: RequirementReviewCommentResponseDto })
    @ApiBadRequestResponse({ description: 'The request body is invalid.' })
    @ApiNotFoundResponse({ description: 'The requirement or review comment was not found.' })
    async closeReviewComment(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Param('commentId') commentId: string,
        @Body(new ZodValidationPipe(closeRequirementReviewCommentSchema))
        closeCommentDto: CloseRequirementReviewCommentDto,
    ): Promise<RequirementReviewCommentResponseDto> {
        return this.requirementReviewsService.closeReviewComment(projectId, requirementId, commentId, closeCommentDto);
    }

    @Post('review/approve')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ operationId: 'approveRequirementReview', summary: 'Approve a reviewed requirement.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Requirement identifier.' })
    @ApiOkResponse({ description: 'The requirement was approved.', type: RequirementResponseDto })
    @ApiBadRequestResponse({ description: 'The requirement cannot be approved.' })
    @ApiNotFoundResponse({ description: 'The requirement was not found.' })
    async approveRequirement(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Body(new ZodValidationPipe(approveRequirementSchema)) approveRequirementDto: ApproveRequirementDto,
    ): Promise<RequirementResponseDto> {
        return this.requirementReviewsService.approveRequirement(projectId, requirementId, approveRequirementDto);
    }

    @Post('review/reject')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ operationId: 'rejectRequirementReview', summary: 'Reject a reviewed requirement.' })
    @ApiParam({ name: 'projectId', description: 'Project identifier.' })
    @ApiParam({ name: 'requirementId', description: 'Requirement identifier.' })
    @ApiOkResponse({ description: 'The requirement was rejected.', type: RequirementResponseDto })
    @ApiBadRequestResponse({ description: 'The requirement cannot be rejected.' })
    @ApiNotFoundResponse({ description: 'The requirement was not found.' })
    async rejectRequirement(
        @Param('projectId') projectId: string,
        @Param('requirementId') requirementId: string,
        @Body(new ZodValidationPipe(rejectRequirementSchema)) rejectRequirementDto: RejectRequirementDto,
    ): Promise<RequirementResponseDto> {
        return this.requirementReviewsService.rejectRequirement(projectId, requirementId, rejectRequirementDto);
    }
}
