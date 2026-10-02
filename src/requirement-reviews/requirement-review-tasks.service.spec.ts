import { AccountRole } from '@/auth/accounts/account-role.enum';
import { UserStatus } from '@/auth/accounts/user-status.enum';
import { User } from '@/auth/accounts/users.entity';
import { ProjectMembership } from '@/auth/authorization/project-membership.entity';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import { Requirement } from '@/projects/requirements.entity';
import { RequirementReviewTaskStatus } from '@/requirement-reviews/requirement-review-task-status.enum';
import { RequirementReviewTask } from '@/requirement-reviews/requirement-review-task.entity';
import { RequirementReviewTasksService } from '@/requirement-reviews/requirement-review-tasks.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const REQUIREMENT_ID = '22222222-2222-4222-8222-222222222222';
const ASSIGNER_ID = '33333333-3333-4333-8333-333333333333';
const ASSIGNEE_ID = '44444444-4444-4444-8444-444444444444';
const TASK_ID = '55555555-5555-4555-8555-555555555555';

function user(id: string, displayName: string): User {
    return Object.assign(new User(), {
        id,
        username: displayName.toLowerCase().replace(' ', ''),
        displayName,
        status: UserStatus.Active,
        role: AccountRole.RequirementsEngineer,
    });
}

function requirement(status = RequirementStatus.Draft): Requirement {
    return Object.assign(new Requirement(), {
        id: REQUIREMENT_ID,
        projectId: PROJECT_ID,
        visibleKey: 'FR-AUTH-0001',
        description: 'Review me.',
        status,
    });
}

function task(status = RequirementReviewTaskStatus.Pending): RequirementReviewTask {
    return Object.assign(new RequirementReviewTask(), {
        id: TASK_ID,
        projectId: PROJECT_ID,
        requirementId: REQUIREMENT_ID,
        assigneeUserId: ASSIGNEE_ID,
        assignedByUserId: ASSIGNER_ID,
        status,
        completedAt: null,
        createdAt: new Date('2026-10-02T08:00:00.000Z'),
        updatedAt: new Date('2026-10-02T08:00:00.000Z'),
        requirement: requirement(),
        assignee: user(ASSIGNEE_ID, 'Review Engineer'),
        assignedBy: user(ASSIGNER_ID, 'Requirements Engineer'),
    });
}

describe('RequirementReviewTasksService', () => {
    const tasks = { find: vi.fn(), findOne: vi.fn(), create: vi.fn(), save: vi.fn() };
    const requirements = { findOne: vi.fn() };
    const memberships = { find: vi.fn(), findOne: vi.fn() };
    let service: RequirementReviewTasksService;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                RequirementReviewTasksService,
                { provide: getRepositoryToken(RequirementReviewTask), useValue: tasks },
                { provide: getRepositoryToken(Requirement), useValue: requirements },
                { provide: getRepositoryToken(ProjectMembership), useValue: memberships },
            ],
        }).compile();
        service = module.get(RequirementReviewTasksService);
    });

    it('lists only other active Requirements Engineers as eligible assignees.', async () => {
        memberships.find.mockResolvedValue([
            { userId: ASSIGNER_ID, user: user(ASSIGNER_ID, 'Requirements Engineer') },
            { userId: ASSIGNEE_ID, user: user(ASSIGNEE_ID, 'Review Engineer') },
            {
                userId: '66666666-6666-4666-8666-666666666666',
                user: Object.assign(user('66666666-6666-4666-8666-666666666666', 'Developer'), {
                    role: AccountRole.Developer,
                }),
            },
        ]);

        await expect(service.listEligibleAssignees(PROJECT_ID, ASSIGNER_ID)).resolves.toEqual([
            { userId: ASSIGNEE_ID, username: 'reviewengineer', displayName: 'Review Engineer' },
        ]);
    });

    it('rejects self assignment and duplicate pending assignments.', async () => {
        requirements.findOne.mockResolvedValue(requirement());
        await expect(
            service.assign(PROJECT_ID, REQUIREMENT_ID, { assigneeUserId: ASSIGNER_ID }, ASSIGNER_ID),
        ).rejects.toBeInstanceOf(BadRequestException);

        memberships.findOne.mockResolvedValue({ userId: ASSIGNEE_ID, user: user(ASSIGNEE_ID, 'Review Engineer') });
        tasks.findOne.mockResolvedValue(task());
        await expect(
            service.assign(PROJECT_ID, REQUIREMENT_ID, { assigneeUserId: ASSIGNEE_ID }, ASSIGNER_ID),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows only the assignee to update task status.', async () => {
        tasks.findOne.mockResolvedValue(task());
        await expect(
            service.updateStatus(
                PROJECT_ID,
                REQUIREMENT_ID,
                TASK_ID,
                { status: RequirementReviewTaskStatus.Completed },
                ASSIGNER_ID,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('completes a pending task without changing requirement content.', async () => {
        const pending = task();
        tasks.findOne.mockResolvedValue(pending);
        tasks.save.mockImplementation(async (value: RequirementReviewTask) => value);

        const result = await service.updateStatus(
            PROJECT_ID,
            REQUIREMENT_ID,
            TASK_ID,
            { status: RequirementReviewTaskStatus.Completed },
            ASSIGNEE_ID,
        );
        expect(result.status).toBe(RequirementReviewTaskStatus.Completed);
        expect(result.completedAt).toBeInstanceOf(Date);
        expect(result.requirementDescription).toBe('Review me.');
    });
});
