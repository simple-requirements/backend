import { AccountRole } from '@/auth/accounts/account-role.enum';
import { UserStatus } from '@/auth/accounts/user-status.enum';
import { User } from '@/auth/accounts/users.entity';
import { ProjectMembership } from '@/auth/authorization/project-membership.entity';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import { Requirement } from '@/projects/requirements.entity';
import type {
    AssignRequirementReviewTaskDto,
    RequirementReviewAssigneeDto,
    RequirementReviewTaskResponseDto,
    UpdateRequirementReviewTaskDto,
} from '@/requirement-reviews/dto/requirement-review-task.dto';
import { RequirementReviewTaskStatus } from '@/requirement-reviews/requirement-review-task-status.enum';
import { RequirementReviewTask } from '@/requirement-reviews/requirement-review-task.entity';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RequirementReviewTasksService {
    constructor(
        @InjectRepository(RequirementReviewTask)
        private readonly tasks: Repository<RequirementReviewTask>,
        @InjectRepository(Requirement)
        private readonly requirements: Repository<Requirement>,
        @InjectRepository(ProjectMembership)
        private readonly memberships: Repository<ProjectMembership>,
    ) {}

    async listEligibleAssignees(projectId: string, actorUserId: string): Promise<RequirementReviewAssigneeDto[]> {
        const memberships = await this.memberships.find({
            where: { projectId },
            relations: { user: true },
            order: { user: { displayName: 'ASC' } },
        });

        return memberships
            .filter(
                (membership) =>
                    membership.userId !== actorUserId
                    && membership.user.role === AccountRole.RequirementsEngineer
                    && membership.user.status === UserStatus.Active,
            )
            .map((membership) => this.toAssigneeDto(membership.user));
    }

    async listMine(projectId: string, actorUserId: string): Promise<RequirementReviewTaskResponseDto[]> {
        const tasks = await this.tasks.find({
            where: { projectId, assigneeUserId: actorUserId },
            relations: { requirement: true, assignee: true, assignedBy: true },
            order: { status: 'ASC', createdAt: 'DESC' },
        });
        return tasks.map((task) => this.toResponseDto(task));
    }

    async listForRequirement(projectId: string, requirementId: string): Promise<RequirementReviewTaskResponseDto[]> {
        await this.getRequirementOrThrow(projectId, requirementId);
        const tasks = await this.tasks.find({
            where: { projectId, requirementId },
            relations: { requirement: true, assignee: true, assignedBy: true },
            order: { createdAt: 'ASC' },
        });
        return tasks.map((task) => this.toResponseDto(task));
    }

    async assign(
        projectId: string,
        requirementId: string,
        dto: AssignRequirementReviewTaskDto,
        actorUserId: string,
    ): Promise<RequirementReviewTaskResponseDto> {
        const requirement = await this.getRequirementOrThrow(projectId, requirementId);
        if (requirement.status !== RequirementStatus.Draft) {
            throw new BadRequestException('Review tasks can only be assigned for draft requirements.');
        }
        if (dto.assigneeUserId === actorUserId) {
            throw new BadRequestException('A review task must be assigned to another Requirements Engineer.');
        }
        await this.requireEligibleAssignee(projectId, dto.assigneeUserId);

        const existing = await this.tasks.findOne({
            where: { projectId, requirementId, assigneeUserId: dto.assigneeUserId },
            relations: { requirement: true, assignee: true, assignedBy: true },
        });
        if (existing?.status === RequirementReviewTaskStatus.Pending) {
            throw new BadRequestException('A pending review task already exists for this assignee.');
        }

        const task =
            existing
            ?? this.tasks.create({
                projectId,
                requirementId,
                assigneeUserId: dto.assigneeUserId,
                assignedByUserId: actorUserId,
            });
        task.assignedByUserId = actorUserId;
        task.status = RequirementReviewTaskStatus.Pending;
        task.completedAt = null;
        const saved = await this.tasks.save(task);
        return this.getTaskOrThrow(projectId, requirementId, saved.id);
    }

    async updateStatus(
        projectId: string,
        requirementId: string,
        taskId: string,
        dto: UpdateRequirementReviewTaskDto,
        actorUserId: string,
    ): Promise<RequirementReviewTaskResponseDto> {
        const task = await this.tasks.findOne({
            where: { id: taskId, projectId, requirementId },
            relations: { requirement: true, assignee: true, assignedBy: true },
        });
        if (task === null) throw new NotFoundException(`Review task with id "${taskId}" was not found.`);
        if (task.assigneeUserId !== actorUserId) {
            throw new ForbiddenException('Only the assigned Requirements Engineer can update this review task.');
        }
        if (dto.status === RequirementReviewTaskStatus.Pending && task.requirement.status !== RequirementStatus.Draft) {
            throw new BadRequestException(
                'A review task cannot be reopened after the requirement leaves draft status.',
            );
        }

        task.status = dto.status;
        task.completedAt = dto.status === RequirementReviewTaskStatus.Completed ? new Date() : null;
        return this.toResponseDto(await this.tasks.save(task));
    }

    async completePendingForRequirement(projectId: string, requirementId: string): Promise<void> {
        const pending = await this.tasks.find({
            where: { projectId, requirementId, status: RequirementReviewTaskStatus.Pending },
        });
        if (pending.length === 0) return;
        const completedAt = new Date();
        pending.forEach((task) => {
            task.status = RequirementReviewTaskStatus.Completed;
            task.completedAt = completedAt;
        });
        await this.tasks.save(pending);
    }

    private async requireEligibleAssignee(projectId: string, userId: string): Promise<void> {
        const membership = await this.memberships.findOne({ where: { projectId, userId }, relations: { user: true } });
        if (
            membership?.user.role !== AccountRole.RequirementsEngineer
            || membership.user.status !== UserStatus.Active
        ) {
            throw new BadRequestException('Only active Requirements Engineers in the same project can be assigned.');
        }
    }

    private async getRequirementOrThrow(projectId: string, requirementId: string): Promise<Requirement> {
        const requirement = await this.requirements.findOne({ where: { id: requirementId, projectId } });
        if (requirement === null) {
            throw new NotFoundException(
                `Requirement with id "${requirementId}" in project "${projectId}" was not found.`,
            );
        }
        return requirement;
    }

    private async getTaskOrThrow(
        projectId: string,
        requirementId: string,
        taskId: string,
    ): Promise<RequirementReviewTaskResponseDto> {
        const task = await this.tasks.findOne({
            where: { id: taskId, projectId, requirementId },
            relations: { requirement: true, assignee: true, assignedBy: true },
        });
        if (task === null) throw new NotFoundException(`Review task with id "${taskId}" was not found.`);
        return this.toResponseDto(task);
    }

    private toAssigneeDto(user: User): RequirementReviewAssigneeDto {
        return { userId: user.id, username: user.username, displayName: user.displayName };
    }

    private toResponseDto(task: RequirementReviewTask): RequirementReviewTaskResponseDto {
        return {
            id: task.id,
            projectId: task.projectId,
            requirementId: task.requirementId,
            requirementKey: task.requirement.visibleKey,
            requirementDescription: task.requirement.description,
            status: task.status,
            assignee: this.toAssigneeDto(task.assignee),
            assignedBy: this.toAssigneeDto(task.assignedBy),
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            completedAt: task.completedAt,
        };
    }
}
