import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequirementRevision } from '@/projects/requirement-revisions.entity';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import { Requirement } from '@/projects/requirements.entity';
import { RequirementReviewCommentCloseReason } from '@/requirement-reviews/requirement-review-comment-close-reason.enum';
import { RequirementReviewCommentStatus } from '@/requirement-reviews/requirement-review-comment-status.enum';
import { RequirementReviewComment } from '@/requirement-reviews/requirement-review-comment.entity';
import { RequirementReviewCommentReply } from '@/requirement-reviews/requirement-review-comment-reply.entity';
import { RequirementReviewState } from '@/requirement-reviews/requirement-review-state.enum';
import { RequirementReviewsService } from '@/requirement-reviews/requirement-reviews.service';

interface RequirementsRepositoryMock {
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
}

interface RequirementRevisionsRepositoryMock {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
}

interface ReviewCommentsRepositoryMock {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
}

interface ReviewCommentRepliesRepositoryMock {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
}

const PROJECT_ID = '9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b';
const CATEGORY_ID = '2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d10';
const REQUIREMENT_ID = '3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11';
const COMMENT_ID = '8b7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d14';

function createRequirementEntity(overrides: Partial<Requirement> = {}): Requirement {
    const requirement = new Requirement();

    requirement.id = REQUIREMENT_ID;
    requirement.projectId = PROJECT_ID;
    requirement.categoryId = CATEGORY_ID;
    requirement.sequenceNumber = 1;
    requirement.visibleKey = 'FR-AUTH-0001';
    requirement.revisionNumber = 1;
    requirement.status = RequirementStatus.Draft;
    requirement.description = 'Users must sign in.';
    requirement.priority = 'p1';
    requirement.owner = 'Product Owner';
    requirement.rationale = 'Protect data.';
    requirement.source = 'Workshop';
    requirement.rejectionReason = null;
    requirement.reviewer = null;
    requirement.obsoletedBy = null;
    requirement.rejectedAt = null;
    requirement.deletedAt = null;
    requirement.approvedAt = null;
    requirement.implementedAt = null;
    requirement.obsolescenceReason = null;
    requirement.obsoleteAt = null;
    requirement.createdAt = new Date('2026-06-28T10:00:00.000Z');
    requirement.updatedAt = new Date('2026-06-28T10:00:00.000Z');
    requirement.revisions = [];
    requirement.reviewComments = [];
    requirement.implementationTickets = [];

    return Object.assign(requirement, overrides);
}

function createReviewCommentEntity(overrides: Partial<RequirementReviewComment> = {}): RequirementReviewComment {
    const comment = new RequirementReviewComment();

    comment.id = COMMENT_ID;
    comment.projectId = PROJECT_ID;
    comment.requirementId = REQUIREMENT_ID;
    comment.createdForRevisionNumber = 1;
    comment.text = 'Please define allowed authentication methods.';
    comment.status = RequirementReviewCommentStatus.Open;
    comment.author = 'Jane Reviewer';
    comment.closedBy = null;
    comment.closeReason = null;
    comment.closedInRevisionNumber = null;
    comment.closedAt = null;
    comment.createdAt = new Date('2026-06-28T10:00:00.000Z');
    comment.updatedAt = new Date('2026-06-28T10:00:00.000Z');
    comment.replies = [];

    return Object.assign(comment, overrides);
}

describe('RequirementReviewsService', () => {
    let service: RequirementReviewsService;
    let requirementsRepository: RequirementsRepositoryMock;
    let requirementRevisionsRepository: RequirementRevisionsRepositoryMock;
    let reviewCommentsRepository: ReviewCommentsRepositoryMock;
    let reviewCommentRepliesRepository: ReviewCommentRepliesRepositoryMock;

    beforeAll(async () => {
        requirementsRepository = { findOne: vi.fn(), save: vi.fn() };
        requirementRevisionsRepository = { create: vi.fn(), save: vi.fn() };
        reviewCommentsRepository = {
            count: vi.fn(),
            create: vi.fn(),
            find: vi.fn(),
            findOne: vi.fn(),
            save: vi.fn(),
        };
        reviewCommentRepliesRepository = { create: vi.fn(), save: vi.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequirementReviewsService,
                {
                    provide: getRepositoryToken(Requirement),
                    useValue: requirementsRepository,
                },
                {
                    provide: getRepositoryToken(RequirementRevision),
                    useValue: requirementRevisionsRepository,
                },
                {
                    provide: getRepositoryToken(RequirementReviewComment),
                    useValue: reviewCommentsRepository,
                },
                {
                    provide: getRepositoryToken(RequirementReviewCommentReply),
                    useValue: reviewCommentRepliesRepository,
                },
            ],
        }).compile();

        service = module.get<RequirementReviewsService>(RequirementReviewsService);
    });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('derives the in-review and decision-pending states from main comment counts.', async () => {
        requirementsRepository.findOne.mockResolvedValue(createRequirementEntity());
        reviewCommentsRepository.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

        await expect(service.getReviewSummary(PROJECT_ID, REQUIREMENT_ID)).resolves.toEqual({
            commentCount: 2,
            openCommentCount: 1,
            state: RequirementReviewState.InReview,
        });

        reviewCommentsRepository.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
        await expect(service.getReviewSummary(PROJECT_ID, REQUIREMENT_ID)).resolves.toEqual({
            commentCount: 2,
            openCommentCount: 0,
            state: RequirementReviewState.DecisionPending,
        });
    });

    it('rejects replies to closed comments.', async () => {
        requirementsRepository.findOne.mockResolvedValue(createRequirementEntity());
        reviewCommentsRepository.findOne.mockResolvedValue(
            createReviewCommentEntity({
                status: RequirementReviewCommentStatus.Closed,
            }),
        );

        await expect(
            service.createReviewCommentReply(PROJECT_ID, REQUIREMENT_ID, COMMENT_ID, {
                text: 'A late reply.',
                author: 'Alice',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(reviewCommentRepliesRepository.save).not.toHaveBeenCalled();
    });

    it('creates an open review comment for the current requirement revision.', async () => {
        const requirement = createRequirementEntity({ revisionNumber: 2 });
        const createdComment = createReviewCommentEntity({
            id: undefined,
            createdForRevisionNumber: 2,
        });
        const savedComment = createReviewCommentEntity({
            createdForRevisionNumber: 2,
        });

        requirementsRepository.findOne.mockResolvedValue(requirement);
        reviewCommentsRepository.create.mockReturnValue(createdComment);
        reviewCommentsRepository.save.mockResolvedValue(savedComment);

        const result = await service.createReviewComment(PROJECT_ID, REQUIREMENT_ID, {
            text: 'Please define allowed authentication methods.',
            author: 'Jane Reviewer',
        });

        expect(reviewCommentsRepository.create).toHaveBeenCalledWith({
            projectId: PROJECT_ID,
            requirementId: REQUIREMENT_ID,
            createdForRevisionNumber: 2,
            text: 'Please define allowed authentication methods.',
            status: RequirementReviewCommentStatus.Open,
            author: 'Jane Reviewer',
            closedBy: null,
            closeReason: null,
            closedInRevisionNumber: null,
            closedAt: null,
        });
        expect(result.status).toBe(RequirementReviewCommentStatus.Open);
    });

    it('does not approve a requirement while review comments are open.', async () => {
        requirementsRepository.findOne.mockResolvedValue(createRequirementEntity());
        reviewCommentsRepository.count.mockResolvedValue(1);

        await expect(
            service.approveRequirement(PROJECT_ID, REQUIREMENT_ID, {
                reviewer: 'Jane Reviewer',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementRevisionsRepository.save).not.toHaveBeenCalled();
        expect(requirementsRepository.save).not.toHaveBeenCalled();
    });

    it('approves a draft requirement when all review comments are closed.', async () => {
        const requirement = createRequirementEntity();
        const revision = new RequirementRevision();

        requirementsRepository.findOne.mockResolvedValue(requirement);
        reviewCommentsRepository.count.mockResolvedValue(0);
        requirementRevisionsRepository.create.mockReturnValue(revision);
        requirementRevisionsRepository.save.mockResolvedValue(revision);
        requirementsRepository.save.mockResolvedValue(requirement);

        const result = await service.approveRequirement(PROJECT_ID, REQUIREMENT_ID, { reviewer: 'Jane Reviewer' });

        expect(result.status).toBe(RequirementStatus.Approved);
        expect(result.revisionNumber).toBe(2);
        expect(result.reviewer).toBe('Jane Reviewer');
        expect(result.approvedAt).toBeInstanceOf(Date);
    });

    it('rejects a draft requirement and auto-closes open comments.', async () => {
        const requirement = createRequirementEntity();
        const revision = new RequirementRevision();
        const comment = createReviewCommentEntity();

        requirementsRepository.findOne.mockResolvedValue(requirement);
        requirementRevisionsRepository.create.mockReturnValue(revision);
        requirementRevisionsRepository.save.mockResolvedValue(revision);
        requirementsRepository.save.mockResolvedValue(requirement);
        reviewCommentsRepository.find.mockResolvedValue([comment]);
        reviewCommentsRepository.save.mockResolvedValue([comment]);

        const result = await service.rejectRequirement(PROJECT_ID, REQUIREMENT_ID, {
            reviewer: 'Jane Reviewer',
            rejectionReason: 'The requirement is ambiguous.',
        });

        expect(result.status).toBe(RequirementStatus.Rejected);
        expect(result.revisionNumber).toBe(2);
        expect(comment.status).toBe(RequirementReviewCommentStatus.Closed);
        expect(comment.closeReason).toBe(RequirementReviewCommentCloseReason.RequirementRejected);
        expect(comment.closedInRevisionNumber).toBe(2);
        expect(reviewCommentsRepository.save).toHaveBeenCalledWith([comment]);
    });
});
