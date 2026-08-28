import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

import { Category } from '@/projects/categories.entity';
import { CreateCategoryDto } from '@/projects/dto/create-category.dto';
import { CreateProjectDto } from '@/projects/dto/create-project.dto';
import { CreateRequirementDto } from '@/projects/dto/create-requirement.dto';
import { CategoryResponseDto } from '@/projects/dto/category-response.dto';
import { ProjectResponseDto } from '@/projects/dto/project-response.dto';
import { RequirementResponseDto } from '@/projects/dto/requirement-response.dto';
import type { RequirementRevisionQueryDto } from '@/projects/dto/requirement-revision-query.dto';
import { UpdateCategoryDto } from '@/projects/dto/update-category.dto';
import { UpdateProjectDto } from '@/projects/dto/update-project.dto';
import { UpdateRequirementDto } from '@/projects/dto/update-requirement.dto';
import { Project } from '@/projects/projects.entity';
import { MAX_REQUIREMENT_SEQUENCE_NUMBER } from '@/projects/requirement.constants';
import { RequirementRevision } from '@/projects/requirement-revisions.entity';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import { Requirement } from '@/projects/requirements.entity';
import { RequirementImplementationTicket } from '@/projects/requirement-implementation-ticket.entity';
import { ImplementationTicketResponseDto, UpsertImplementationTicketDto } from '@/projects/dto/implementation-ticket.dto';

const CONTENT_FIELD_NAMES = ['categoryId', 'description', 'priority', 'owner', 'rationale', 'source'] as const;

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(Project)
        private readonly projectsRepository: Repository<Project>,

        @InjectRepository(Category)
        private readonly categoriesRepository: Repository<Category>,

        @InjectRepository(Requirement)
        private readonly requirementsRepository: Repository<Requirement>,

        @InjectRepository(RequirementRevision)
        private readonly requirementRevisionsRepository: Repository<RequirementRevision>,
        @InjectRepository(RequirementImplementationTicket)
        private readonly implementationTicketsRepository: Repository<RequirementImplementationTicket>,
    ) {}

    async findAll(): Promise<ProjectResponseDto[]> {
        const projects = await this.projectsRepository.find({
            order: { name: 'ASC' },
        });

        return projects.map((project) => this.toProjectResponseDto(project));
    }

    async findOne(id: string): Promise<ProjectResponseDto> {
        const project = await this.getProjectOrThrow(id);

        return this.toProjectResponseDto(project);
    }

    async create(createProjectDto: CreateProjectDto): Promise<ProjectResponseDto> {
        const project = this.projectsRepository.create({
            name: createProjectDto.name,
            ticketUrlTemplate: null,
        });
        const savedProject = await this.projectsRepository.save(project);

        return this.toProjectResponseDto(savedProject);
    }

    async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ProjectResponseDto> {
        const project = await this.getProjectOrThrow(id);

        if (updateProjectDto.name !== undefined) project.name = updateProjectDto.name;
        if (updateProjectDto.ticketUrlTemplate !== undefined) project.ticketUrlTemplate = updateProjectDto.ticketUrlTemplate;

        const savedProject = await this.projectsRepository.save(project);

        return this.toProjectResponseDto(savedProject);
    }

    async delete(id: string): Promise<void> {
        const deleteResult = await this.projectsRepository.delete({ id });

        if (deleteResult.affected !== 1) {
            throw new NotFoundException(`Project with id "${id}" was not found.`);
        }
    }

    async findAllCategories(projectId: string): Promise<CategoryResponseDto[]> {
        await this.getProjectOrThrow(projectId);

        const categories = await this.categoriesRepository.find({
            where: { projectId },
            order: { name: 'ASC' },
        });

        return categories.map((category) => this.toCategoryResponseDto(category));
    }

    async createCategory(projectId: string, createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        await this.getProjectOrThrow(projectId);

        await this.ensureCategoryNameAvailable(projectId, createCategoryDto.name);
        await this.ensureCategoryKeyAvailable(projectId, createCategoryDto.key);

        const category = this.categoriesRepository.create({
            projectId,
            name: createCategoryDto.name,
            key: createCategoryDto.key,
            type: createCategoryDto.type,
        });
        const savedCategory = await this.categoriesRepository.save(category);

        return this.toCategoryResponseDto(savedCategory);
    }

    async updateCategory(projectId: string, categoryId: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
        await this.getProjectOrThrow(projectId);

        const category = await this.getCategoryOrThrow(projectId, categoryId);

        if (updateCategoryDto.name !== undefined) {
            await this.ensureCategoryNameAvailable(projectId, updateCategoryDto.name, categoryId);
            category.name = updateCategoryDto.name;
        }

        if (updateCategoryDto.key !== undefined) {
            await this.ensureCategoryKeyAvailable(projectId, updateCategoryDto.key, categoryId);
            category.key = updateCategoryDto.key;
        }

        if (updateCategoryDto.type !== undefined) {
            category.type = updateCategoryDto.type;
        }

        const savedCategory = await this.categoriesRepository.save(category);

        return this.toCategoryResponseDto(savedCategory);
    }

    async deleteCategory(projectId: string, categoryId: string): Promise<void> {
        await this.getProjectOrThrow(projectId);

        const deleteResult = await this.categoriesRepository.delete({
            id: categoryId,
            projectId,
        });

        if (deleteResult.affected !== 1) {
            throw new NotFoundException(`Category with id "${categoryId}" in project "${projectId}" was not found.`);
        }
    }

    async findAllRequirements(projectId: string, deletedOnly: boolean): Promise<RequirementResponseDto[]> {
        await this.getProjectOrThrow(projectId);

        const requirements = await this.requirementsRepository.find({
            where: { projectId, deletedAt: deletedOnly ? Not(IsNull()) : IsNull() },
            order: { visibleKey: 'ASC' },
        });

        return requirements.map((requirement) => this.toRequirementResponseDto(requirement));
    }

    async findRequirement(
        projectId: string,
        requirementId: string,
        revisionQuery: RequirementRevisionQueryDto = { allrevisions: false },
    ): Promise<RequirementResponseDto | RequirementResponseDto[]> {
        await this.getProjectOrThrow(projectId);

        const requirement = await this.getRequirementOrThrow(projectId, requirementId);

        if (revisionQuery.allrevisions) {
            const revisions = await this.requirementRevisionsRepository.find({
                where: { requirementId, projectId },
                order: { revisionNumber: 'ASC' },
            });

            return revisions.map((revision) => this.toRequirementRevisionResponseDto(revision));
        }

        if (revisionQuery.revision !== undefined) {
            if (revisionQuery.revision === requirement.revisionNumber) {
                return this.toRequirementResponseDto(requirement);
            }

            const revision = await this.requirementRevisionsRepository.findOne({
                where: {
                    requirementId,
                    projectId,
                    revisionNumber: revisionQuery.revision,
                },
            });

            if (revision === null) {
                throw new NotFoundException(
                    `Revision ${revisionQuery.revision.toString()} of requirement "${requirementId}" in project "${projectId}" was not found.`,
                );
            }

            return this.toRequirementRevisionResponseDto(revision);
        }

        return this.toRequirementResponseDto(requirement);
    }

    async createRequirement(projectId: string, createRequirementDto: CreateRequirementDto): Promise<RequirementResponseDto> {
        await this.getProjectOrThrow(projectId);

        const category = await this.getCategoryOrThrow(projectId, createRequirementDto.categoryId);
        const sequenceNumber = await this.getNextRequirementSequenceNumber(projectId, category.id);

        const requirement = this.requirementsRepository.create({
            projectId,
            categoryId: category.id,
            sequenceNumber,
            visibleKey: this.buildVisibleKey(category, sequenceNumber),
            revisionNumber: 1,
            status: RequirementStatus.Draft,
            description: createRequirementDto.description ?? null,
            priority: createRequirementDto.priority ?? null,
            owner: createRequirementDto.owner ?? null,
            rationale: createRequirementDto.rationale ?? null,
            source: createRequirementDto.source ?? null,
            rejectionReason: null,
            reviewer: null,
            obsoletedBy: null,
            rejectedAt: null,
            deletedAt: null,
            approvedAt: null,
            implementedAt: null,
            obsolescenceReason: null,
            obsoleteAt: null,
            implementationTickets: [],
        });
        const savedRequirement = await this.requirementsRepository.save(requirement);
        savedRequirement.implementationTickets = [];

        return this.toRequirementResponseDto(savedRequirement);
    }

    async updateRequirement(projectId: string, requirementId: string, updateRequirementDto: UpdateRequirementDto): Promise<RequirementResponseDto> {
        await this.getProjectOrThrow(projectId);

        const requirement = await this.getRequirementOrThrow(projectId, requirementId);

        if (requirement.deletedAt !== null) {
            throw new BadRequestException(`Requirement with id "${requirementId}" is in the recycle bin and cannot be changed.`);
        }

        const categoryChange = await this.prepareRequirementContentChange(projectId, requirement, updateRequirementDto);

        if (updateRequirementDto.status !== undefined) {
            this.validateRequirementStatusChange(requirement, updateRequirementDto);
            if (updateRequirementDto.status === RequirementStatus.Implemented && requirement.implementationTickets.length === 0) {
                throw new BadRequestException('At least one implementation ticket is required before implementing a requirement.');
            }
        }

        await this.storeCurrentRequirementRevision(requirement);
        requirement.revisionNumber += 1;

        if (updateRequirementDto.status !== undefined) {
            this.applyRequirementStatusChange(requirement, updateRequirementDto);
        } else {
            this.applyRequirementContentChange(requirement, updateRequirementDto, categoryChange);
        }

        const savedRequirement = await this.requirementsRepository.save(requirement);

        return this.toRequirementResponseDto(savedRequirement);
    }

    async deleteRequirement(projectId: string, requirementId: string, deletedOnly: boolean): Promise<void> {
        await this.getProjectOrThrow(projectId);

        const requirement = await this.getRequirementOrThrow(projectId, requirementId);

        if (deletedOnly) {
            if (requirement.deletedAt === null) {
                throw new BadRequestException(`Requirement with id "${requirementId}" is not in the recycle bin.`);
            }

            await this.requirementsRepository.delete({
                id: requirementId,
                projectId,
            });
            return;
        }

        if (requirement.status !== RequirementStatus.Draft) {
            throw new BadRequestException('Only draft requirements can be deleted.');
        }

        if (requirement.deletedAt !== null) {
            return;
        }

        requirement.deletedAt = new Date();

        await this.requirementsRepository.save(requirement);
    }

    async clearDeletedRequirements(projectId: string, deletedOnly: boolean): Promise<void> {
        if (!deletedOnly) {
            throw new BadRequestException('Clearing requirements requires the deleted query parameter.');
        }

        await this.getProjectOrThrow(projectId);

        await this.requirementsRepository.delete({
            projectId,
            deletedAt: Not(IsNull()),
        });
    }

    async listImplementationTickets(projectId: string, requirementId: string): Promise<ImplementationTicketResponseDto[]> {
        const project = await this.getProjectOrThrow(projectId);
        await this.getRequirementOrThrow(projectId, requirementId);
        const tickets = await this.implementationTicketsRepository.find({ where: { requirementId }, order: { ticketId: 'ASC' } });
        return tickets.map((ticket) => this.toImplementationTicketResponseDto(ticket, project.ticketUrlTemplate));
    }

    async createImplementationTicket(projectId: string, requirementId: string, dto: UpsertImplementationTicketDto): Promise<ImplementationTicketResponseDto> {
        const project = await this.getProjectOrThrow(projectId);
        const requirement = await this.getRequirementOrThrow(projectId, requirementId);
        this.assertTicketsEditable(requirement);
        await this.ensureTicketIdAvailable(requirementId, dto.ticketId);
        await this.storeCurrentRequirementRevision(requirement);
        const ticket = this.implementationTicketsRepository.create({
            requirementId,
            ticketId: dto.ticketId,
            completedBy: dto.completedBy,
            completedAt: dto.completedAt,
        });
        const savedTicket = await this.implementationTicketsRepository.save(ticket);
        requirement.implementationTickets = [...requirement.implementationTickets, savedTicket];
        requirement.revisionNumber += 1;
        await this.requirementsRepository.save(requirement);
        return this.toImplementationTicketResponseDto(savedTicket, project.ticketUrlTemplate);
    }

    async updateImplementationTicket(projectId: string, requirementId: string, ticketRecordId: string, dto: UpsertImplementationTicketDto): Promise<ImplementationTicketResponseDto> {
        const project = await this.getProjectOrThrow(projectId);
        const requirement = await this.getRequirementOrThrow(projectId, requirementId);
        this.assertTicketsEditable(requirement);
        const ticket = await this.getImplementationTicketOrThrow(requirementId, ticketRecordId);
        await this.ensureTicketIdAvailable(requirementId, dto.ticketId, ticketRecordId);
        await this.storeCurrentRequirementRevision(requirement);
        Object.assign(ticket, dto);
        const savedTicket = await this.implementationTicketsRepository.save(ticket);
        requirement.implementationTickets = requirement.implementationTickets.map((item) => item.id === savedTicket.id ? savedTicket : item);
        requirement.revisionNumber += 1;
        await this.requirementsRepository.save(requirement);
        return this.toImplementationTicketResponseDto(savedTicket, project.ticketUrlTemplate);
    }

    async deleteImplementationTicket(projectId: string, requirementId: string, ticketRecordId: string): Promise<void> {
        await this.getProjectOrThrow(projectId);
        const requirement = await this.getRequirementOrThrow(projectId, requirementId);
        this.assertTicketsEditable(requirement);
        await this.getImplementationTicketOrThrow(requirementId, ticketRecordId);
        await this.storeCurrentRequirementRevision(requirement);
        await this.implementationTicketsRepository.delete({ id: ticketRecordId, requirementId });
        requirement.implementationTickets = requirement.implementationTickets.filter((item) => item.id !== ticketRecordId);
        requirement.revisionNumber += 1;
        await this.requirementsRepository.save(requirement);
    }

    private assertTicketsEditable(requirement: Requirement): void {
        if (requirement.status !== RequirementStatus.Approved) {
            throw new BadRequestException('Implementation tickets can only be changed while the requirement is approved.');
        }
    }

    private async ensureTicketIdAvailable(requirementId: string, ticketId: string, excludedId?: string): Promise<void> {
        const duplicate = await this.implementationTicketsRepository.findOne({
            where: excludedId === undefined ? { requirementId, ticketId } : { requirementId, ticketId, id: Not(excludedId) },
        });
        if (duplicate !== null) throw new BadRequestException(`Implementation ticket "${ticketId}" already exists for this requirement.`);
    }

    private async getImplementationTicketOrThrow(requirementId: string, id: string): Promise<RequirementImplementationTicket> {
        const ticket = await this.implementationTicketsRepository.findOne({ where: { id, requirementId } });
        if (ticket === null) throw new NotFoundException(`Implementation ticket with id "${id}" was not found.`);
        return ticket;
    }

    private async getProjectOrThrow(projectId: string): Promise<Project> {
        const project = await this.projectsRepository.findOne({
            where: { id: projectId },
        });

        if (project === null) {
            throw new NotFoundException(`Project with id "${projectId}" was not found.`);
        }

        return project;
    }

    private async getCategoryOrThrow(projectId: string, categoryId: string): Promise<Category> {
        const category = await this.categoriesRepository.findOne({
            where: { id: categoryId, projectId },
        });

        if (category === null) {
            throw new NotFoundException(`Category with id "${categoryId}" in project "${projectId}" was not found.`);
        }

        return category;
    }

    private async getRequirementOrThrow(projectId: string, requirementId: string): Promise<Requirement> {
        const requirement = await this.requirementsRepository.findOne({
            where: { id: requirementId, projectId },
        });

        if (requirement === null) {
            throw new NotFoundException(`Requirement with id "${requirementId}" in project "${projectId}" was not found.`);
        }

        return requirement;
    }

    private async ensureCategoryNameAvailable(projectId: string, name: string, excludedCategoryId?: string): Promise<void> {
        const duplicateCategory = await this.categoriesRepository.findOne({
            where: excludedCategoryId === undefined ? { projectId, name } : { projectId, name, id: Not(excludedCategoryId) },
        });

        if (duplicateCategory !== null) {
            throw new BadRequestException(`Category name "${name}" already exists in this project.`);
        }
    }

    private async ensureCategoryKeyAvailable(projectId: string, key: string, excludedCategoryId?: string): Promise<void> {
        const duplicateCategory = await this.categoriesRepository.findOne({
            where: excludedCategoryId === undefined ? { projectId, key } : { projectId, key, id: Not(excludedCategoryId) },
        });

        if (duplicateCategory !== null) {
            throw new BadRequestException(`Category key "${key}" already exists in this project.`);
        }
    }

    private async getNextRequirementSequenceNumber(projectId: string, categoryId: string): Promise<number> {
        const latestRequirement = await this.requirementsRepository.findOne({
            where: { projectId, categoryId },
            order: { sequenceNumber: 'DESC' },
        });
        const sequenceNumber = (latestRequirement?.sequenceNumber ?? 0) + 1;

        if (sequenceNumber > MAX_REQUIREMENT_SEQUENCE_NUMBER) {
            throw new BadRequestException('No more requirement keys are available for this category.');
        }

        return sequenceNumber;
    }

    private buildVisibleKey(category: Category, sequenceNumber: number): string {
        return `${category.type}-${category.key}-${sequenceNumber.toString().padStart(4, '0')}`;
    }

    private async storeCurrentRequirementRevision(requirement: Requirement): Promise<void> {
        const revision = this.requirementRevisionsRepository.create({
            requirementId: requirement.id,
            projectId: requirement.projectId,
            categoryId: requirement.categoryId,
            sequenceNumber: requirement.sequenceNumber,
            visibleKey: requirement.visibleKey,
            revisionNumber: requirement.revisionNumber,
            status: requirement.status,
            description: requirement.description,
            priority: requirement.priority,
            owner: requirement.owner,
            rationale: requirement.rationale,
            source: requirement.source,
            rejectionReason: requirement.rejectionReason,
            reviewer: requirement.reviewer,
            obsoletedBy: requirement.obsoletedBy,
            implementationTickets: requirement.implementationTickets.map(({ id, ticketId, completedBy, completedAt }) => ({ id, ticketId, completedBy, completedAt })),
            rejectedAt: requirement.rejectedAt,
            deletedAt: requirement.deletedAt,
            approvedAt: requirement.approvedAt,
            implementedAt: requirement.implementedAt,
            obsolescenceReason: requirement.obsolescenceReason,
            obsoleteAt: requirement.obsoleteAt,
            createdAt: requirement.createdAt,
            updatedAt: requirement.updatedAt,
        });

        await this.requirementRevisionsRepository.save(revision);
    }

    private async prepareRequirementContentChange(
        projectId: string,
        requirement: Requirement,
        updateRequirementDto: UpdateRequirementDto,
    ): Promise<Readonly<{ category: Category; sequenceNumber: number }> | undefined> {
        if (updateRequirementDto.status !== undefined) {
            return undefined;
        }

        if (
            requirement.status !== RequirementStatus.Draft &&
            requirement.status !== RequirementStatus.Rejected &&
            requirement.status !== RequirementStatus.Approved
        ) {
            throw new BadRequestException(`Requirement in status "${requirement.status}" cannot be changed.`);
        }

        if (updateRequirementDto.categoryId === undefined || updateRequirementDto.categoryId === requirement.categoryId) {
            return undefined;
        }

        const category = await this.getCategoryOrThrow(projectId, updateRequirementDto.categoryId);
        const sequenceNumber = await this.getNextRequirementSequenceNumber(projectId, category.id);

        return { category, sequenceNumber };
    }

    private applyRequirementContentChange(
        requirement: Requirement,
        updateRequirementDto: UpdateRequirementDto,
        categoryChange: Readonly<{ category: Category; sequenceNumber: number }> | undefined,
    ): void {
        if (categoryChange !== undefined) {
            requirement.categoryId = categoryChange.category.id;
            requirement.sequenceNumber = categoryChange.sequenceNumber;
            requirement.visibleKey = this.buildVisibleKey(categoryChange.category, categoryChange.sequenceNumber);
        }

        for (const fieldName of CONTENT_FIELD_NAMES) {
            if (fieldName !== 'categoryId' && updateRequirementDto[fieldName] !== undefined) {
                requirement[fieldName] = updateRequirementDto[fieldName];
            }
        }

        requirement.status = RequirementStatus.Draft;
        requirement.rejectionReason = null;
        requirement.reviewer = null;
        requirement.obsoletedBy = null;
        requirement.rejectedAt = null;
        requirement.approvedAt = null;
        requirement.implementedAt = null;
        requirement.obsolescenceReason = null;
        requirement.obsoleteAt = null;
    }

    private validateRequirementStatusChange(requirement: Requirement, updateRequirementDto: UpdateRequirementDto): void {
        switch (updateRequirementDto.status) {
            case RequirementStatus.Approved:
                if (requirement.status !== RequirementStatus.Draft) {
                    throw new BadRequestException(`Requirement in status "${requirement.status}" cannot be approved.`);
                }

                if (updateRequirementDto.reviewer === undefined || updateRequirementDto.reviewer === null) {
                    throw new BadRequestException('Reviewer must be provided when approving a requirement.');
                }

                return;

            case RequirementStatus.Rejected:
                if (requirement.status !== RequirementStatus.Draft) {
                    throw new BadRequestException(`Requirement in status "${requirement.status}" cannot be rejected.`);
                }

                if (updateRequirementDto.reviewer === undefined || updateRequirementDto.reviewer === null) {
                    throw new BadRequestException('Reviewer must be provided when rejecting a requirement.');
                }

                if (updateRequirementDto.rejectionReason === undefined || updateRequirementDto.rejectionReason === null) {
                    throw new BadRequestException('Rejection reason must be provided when rejecting a requirement.');
                }

                return;

            case RequirementStatus.Implemented:
                if (requirement.status !== RequirementStatus.Approved) {
                    throw new BadRequestException(`Requirement in status "${requirement.status}" cannot be implemented.`);
                }

                return;

            case RequirementStatus.Obsolete:
                this.getObsolescenceMetadata(requirement, updateRequirementDto);
                return;

            default:
                throw new BadRequestException('Requirement status cannot be changed to draft directly.');
        }
    }

    private applyRequirementStatusChange(requirement: Requirement, updateRequirementDto: UpdateRequirementDto): void {
        switch (updateRequirementDto.status) {
            case RequirementStatus.Approved:
                this.applyApproval(requirement, updateRequirementDto);
                return;

            case RequirementStatus.Rejected:
                this.applyRejection(requirement, updateRequirementDto);
                return;

            case RequirementStatus.Implemented:
                this.applyImplementation(requirement);
                return;

            case RequirementStatus.Obsolete:
                this.applyObsolescence(requirement, updateRequirementDto);
                return;

            default:
                throw new BadRequestException('Requirement status cannot be changed to draft directly.');
        }
    }

    private applyApproval(requirement: Requirement, updateRequirementDto: UpdateRequirementDto): void {
        if (requirement.status !== RequirementStatus.Draft) {
            throw new BadRequestException(`Requirement in status "${requirement.status}" cannot be approved.`);
        }

        if (updateRequirementDto.reviewer === undefined || updateRequirementDto.reviewer === null) {
            throw new BadRequestException('Reviewer must be provided when approving a requirement.');
        }

        requirement.status = RequirementStatus.Approved;
        requirement.reviewer = updateRequirementDto.reviewer;
        requirement.rejectionReason = null;
        requirement.rejectedAt = null;
        requirement.approvedAt = new Date();
        requirement.implementedAt = null;
        requirement.obsolescenceReason = null;
        requirement.obsoletedBy = null;
        requirement.obsoleteAt = null;
    }

    private applyRejection(requirement: Requirement, updateRequirementDto: UpdateRequirementDto): void {
        if (requirement.status !== RequirementStatus.Draft) {
            throw new BadRequestException(`Requirement in status "${requirement.status}" cannot be rejected.`);
        }

        if (updateRequirementDto.reviewer === undefined || updateRequirementDto.reviewer === null) {
            throw new BadRequestException('Reviewer must be provided when rejecting a requirement.');
        }

        if (updateRequirementDto.rejectionReason === undefined || updateRequirementDto.rejectionReason === null) {
            throw new BadRequestException('Rejection reason must be provided when rejecting a requirement.');
        }

        requirement.status = RequirementStatus.Rejected;
        requirement.reviewer = updateRequirementDto.reviewer;
        requirement.rejectionReason = updateRequirementDto.rejectionReason;
        requirement.rejectedAt = new Date();
        requirement.approvedAt = null;
        requirement.implementedAt = null;
        requirement.obsolescenceReason = null;
        requirement.obsoletedBy = null;
        requirement.obsoleteAt = null;
    }

    private applyImplementation(requirement: Requirement): void {
        if (requirement.status !== RequirementStatus.Approved) {
            throw new BadRequestException(`Requirement in status "${requirement.status}" cannot be implemented.`);
        }

        requirement.status = RequirementStatus.Implemented;
        requirement.implementedAt = new Date();
    }

    private applyObsolescence(requirement: Requirement, updateRequirementDto: UpdateRequirementDto): void {
        const [obsoletedBy, obsolescenceReason] = this.getObsolescenceMetadata(requirement, updateRequirementDto);

        requirement.status = RequirementStatus.Obsolete;
        requirement.obsoletedBy = obsoletedBy;
        requirement.obsolescenceReason = obsolescenceReason;
        requirement.obsoleteAt = new Date();
    }

    private getObsolescenceMetadata(
        requirement: Requirement,
        updateRequirementDto: UpdateRequirementDto,
    ): readonly [obsoletedBy: string, obsolescenceReason: string] {
        if (requirement.status !== RequirementStatus.Approved && requirement.status !== RequirementStatus.Implemented) {
            throw new BadRequestException(`Requirement in status "${requirement.status}" cannot be set obsolete.`);
        }

        if (updateRequirementDto.obsoletedBy === undefined || updateRequirementDto.obsoletedBy === null) {
            throw new BadRequestException('User name must be provided when setting a requirement obsolete.');
        }

        if (updateRequirementDto.obsolescenceReason === undefined || updateRequirementDto.obsolescenceReason === null) {
            throw new BadRequestException('Obsolescence reason must be provided when setting a requirement obsolete.');
        }

        return [updateRequirementDto.obsoletedBy, updateRequirementDto.obsolescenceReason];
    }

    private toProjectResponseDto(project: Project): ProjectResponseDto {
        return {
            id: project.id,
            name: project.name,
            ticketUrlTemplate: project.ticketUrlTemplate,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }

    private toCategoryResponseDto(category: Category): CategoryResponseDto {
        return {
            id: category.id,
            projectId: category.projectId,
            name: category.name,
            key: category.key,
            type: category.type,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        };
    }

    private toRequirementRevisionResponseDto(revision: RequirementRevision): RequirementResponseDto {
        return {
            id: revision.requirementId,
            projectId: revision.projectId,
            categoryId: revision.categoryId,
            sequenceNumber: revision.sequenceNumber,
            visibleKey: revision.visibleKey,
            revisionNumber: revision.revisionNumber,
            status: revision.status,
            description: revision.description,
            priority: revision.priority,
            owner: revision.owner,
            rationale: revision.rationale,
            source: revision.source,
            rejectionReason: revision.rejectionReason,
            reviewer: revision.reviewer,
            obsoletedBy: revision.obsoletedBy,
            implementationTickets: revision.implementationTickets.map((ticket) => ({
                ...ticket,
                requirementId: revision.requirementId,
                url: null,
                createdAt: revision.updatedAt,
                updatedAt: revision.updatedAt,
            })),
            rejectedAt: revision.rejectedAt,
            deletedAt: revision.deletedAt,
            approvedAt: revision.approvedAt,
            implementedAt: revision.implementedAt,
            obsolescenceReason: revision.obsolescenceReason,
            obsoleteAt: revision.obsoleteAt,
            createdAt: revision.createdAt,
            updatedAt: revision.updatedAt,
        };
    }

    private toRequirementResponseDto(requirement: Requirement): RequirementResponseDto {
        return {
            id: requirement.id,
            projectId: requirement.projectId,
            categoryId: requirement.categoryId,
            sequenceNumber: requirement.sequenceNumber,
            visibleKey: requirement.visibleKey,
            revisionNumber: requirement.revisionNumber,
            status: requirement.status,
            description: requirement.description,
            priority: requirement.priority,
            owner: requirement.owner,
            rationale: requirement.rationale,
            source: requirement.source,
            rejectionReason: requirement.rejectionReason,
            reviewer: requirement.reviewer,
            obsoletedBy: requirement.obsoletedBy,
            implementationTickets: requirement.implementationTickets.map((ticket) =>
                this.toImplementationTicketResponseDto(ticket, requirement.project.ticketUrlTemplate),
            ),
            rejectedAt: requirement.rejectedAt,
            deletedAt: requirement.deletedAt,
            approvedAt: requirement.approvedAt,
            implementedAt: requirement.implementedAt,
            obsolescenceReason: requirement.obsolescenceReason,
            obsoleteAt: requirement.obsoleteAt,
            createdAt: requirement.createdAt,
            updatedAt: requirement.updatedAt,
        };
    }

    private toImplementationTicketResponseDto(ticket: RequirementImplementationTicket, template: string | null): ImplementationTicketResponseDto {
        return {
            id: ticket.id,
            requirementId: ticket.requirementId,
            ticketId: ticket.ticketId,
            completedBy: ticket.completedBy,
            completedAt: ticket.completedAt,
            url: template === null ? null : template.replace('{ticket-id}', encodeURIComponent(ticket.ticketId)),
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
        };
    }
}
