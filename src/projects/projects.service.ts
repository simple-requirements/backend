import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";

import { Category } from "@/projects/categories.entity";
import { CreateCategoryDto } from "@/projects/dto/create-category.dto";
import { CreateProjectDto } from "@/projects/dto/create-project.dto";
import { CreateRequirementDto } from "@/projects/dto/create-requirement.dto";
import { CategoryResponseDto } from "@/projects/dto/category-response.dto";
import { ProjectResponseDto } from "@/projects/dto/project-response.dto";
import { RequirementResponseDto } from "@/projects/dto/requirement-response.dto";
import { UpdateCategoryDto } from "@/projects/dto/update-category.dto";
import { UpdateProjectDto } from "@/projects/dto/update-project.dto";
import { UpdateRequirementDto } from "@/projects/dto/update-requirement.dto";
import { Project } from "@/projects/projects.entity";
import { MAX_REQUIREMENT_SEQUENCE_NUMBER } from "@/projects/requirement.constants";
import { RequirementStatus } from "@/projects/requirement-status.enum";
import { Requirement } from "@/projects/requirements.entity";
import { RequirementImplementationTicket } from "@/projects/requirement-implementation-ticket.entity";
import { RequirementLifecycleService } from "@/projects/requirements/requirement-lifecycle.service";
import { RequirementResponseMapper } from "@/projects/requirements/requirement-response.mapper";
import { RequirementRevisionService } from "@/projects/requirements/requirement-revision.service";
import {
  RequirementRevisionChangeType,
  type RequirementRevisionActor,
  type RequirementRevisionMetadata,
  systemRevisionActor,
} from "@/projects/requirements/requirement-revision-metadata";
import {
  ImplementationTicketResponseDto,
  UpsertImplementationTicketDto,
} from "@/projects/dto/implementation-ticket.dto";

const CONTENT_FIELD_NAMES = [
  "categoryId",
  "description",
  "priority",
  "owner",
  "rationale",
  "source",
] as const;

function createRevisionMetadata(
  changeType: RequirementRevisionChangeType,
  changeReason: string,
  actor: RequirementRevisionActor = systemRevisionActor,
): RequirementRevisionMetadata {
  return { changeType, changeReason, actor };
}

function statusChangeReason(update: UpdateRequirementDto): string {
  switch (update.status) {
    case RequirementStatus.Approved:
      return "Requirement approved.";
    case RequirementStatus.Rejected:
      return `Requirement rejected: ${update.rejectionReason ?? "No reason provided."}`;
    case RequirementStatus.Implemented:
      return "Requirement implemented.";
    case RequirementStatus.Obsolete:
      return `Requirement marked obsolete: ${update.obsolescenceReason ?? "No reason provided."}`;
    default:
      return "Requirement changed.";
  }
}

function statusChangeType(update: UpdateRequirementDto): RequirementRevisionChangeType {
  switch (update.status) {
    case RequirementStatus.Approved:
      return RequirementRevisionChangeType.Approved;
    case RequirementStatus.Rejected:
      return RequirementRevisionChangeType.Rejected;
    case RequirementStatus.Implemented:
      return RequirementRevisionChangeType.Implemented;
    case RequirementStatus.Obsolete:
      return RequirementRevisionChangeType.Obsoleted;
    default:
      return RequirementRevisionChangeType.ContentChanged;
  }
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,

    @InjectRepository(Requirement)
    private readonly requirementsRepository: Repository<Requirement>,

    @InjectRepository(RequirementImplementationTicket)
    private readonly implementationTicketsRepository: Repository<RequirementImplementationTicket>,
    private readonly lifecycle: RequirementLifecycleService,
    private readonly requirementMapper: RequirementResponseMapper,
    private readonly revisions: RequirementRevisionService,
  ) {}

  async findAll(projectIds?: string[]): Promise<ProjectResponseDto[]> {
    if (projectIds?.length === 0) return [];
    const projects = await this.projectsRepository.find(
      projectIds === undefined
        ? { order: { name: "ASC" } }
        : { where: { id: In(projectIds) }, order: { name: "ASC" } },
    );

    return projects.map((project) => this.toProjectResponseDto(project));
  }

  async findOne(id: string): Promise<ProjectResponseDto> {
    const project = await this.getProjectOrThrow(id);

    return this.toProjectResponseDto(project);
  }

  async create(
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = this.projectsRepository.create({
      name: createProjectDto.name,
      ticketUrlTemplate: null,
    });
    const savedProject = await this.projectsRepository.save(project);

    return this.toProjectResponseDto(savedProject);
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.getProjectOrThrow(id);

    if (updateProjectDto.name !== undefined)
      project.name = updateProjectDto.name;
    if (updateProjectDto.ticketUrlTemplate !== undefined)
      project.ticketUrlTemplate = updateProjectDto.ticketUrlTemplate;

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
      order: { name: "ASC" },
    });

    return categories.map((category) => this.toCategoryResponseDto(category));
  }

  async createCategory(
    projectId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
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

  async updateCategory(
    projectId: string,
    categoryId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await this.getProjectOrThrow(projectId);

    const category = await this.getCategoryOrThrow(projectId, categoryId);

    if (updateCategoryDto.name !== undefined) {
      await this.ensureCategoryNameAvailable(
        projectId,
        updateCategoryDto.name,
        categoryId,
      );
      category.name = updateCategoryDto.name;
    }

    if (updateCategoryDto.key !== undefined) {
      await this.ensureCategoryKeyAvailable(
        projectId,
        updateCategoryDto.key,
        categoryId,
      );
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
      throw new NotFoundException(
        `Category with id "${categoryId}" in project "${projectId}" was not found.`,
      );
    }
  }

  async findAllRequirements(
    projectId: string,
  ): Promise<RequirementResponseDto[]> {
    await this.getProjectOrThrow(projectId);

    const requirements = await this.requirementsRepository.find({
      where: { projectId },
      order: { visibleKey: "ASC" },
    });

    return requirements.map((requirement) =>
      this.requirementMapper.fromRequirement(requirement),
    );
  }

  async findRequirement(
    projectId: string,
    requirementId: string,
  ): Promise<RequirementResponseDto> {
    await this.getProjectOrThrow(projectId);

    const requirement = await this.getRequirementOrThrow(
      projectId,
      requirementId,
    );

    return this.requirementMapper.fromRequirement(requirement);
  }

  async createRequirement(
    projectId: string,
    createRequirementDto: CreateRequirementDto,
    actor: RequirementRevisionActor = systemRevisionActor,
  ): Promise<RequirementResponseDto> {
    await this.getProjectOrThrow(projectId);

    const category = await this.getCategoryOrThrow(
      projectId,
      createRequirementDto.categoryId,
    );
    const sequenceNumber = await this.getNextRequirementSequenceNumber(
      projectId,
      category.id,
    );

    const requirement = this.requirementsRepository.create({
      projectId,
      categoryId: category.id,
      sequenceNumber,
      visibleKey: this.buildVisibleKey(category, sequenceNumber),
      revisionNumber: 1,
      changeType: RequirementRevisionChangeType.Created,
      changeReason: "Requirement created.",
      changedAt: new Date(),
      changedByUserId: actor.userId,
      changedByDisplayName: actor.displayName,
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
    const savedRequirement =
      await this.requirementsRepository.save(requirement);
    savedRequirement.implementationTickets = [];

    return this.requirementMapper.fromRequirement(savedRequirement);
  }

  async updateRequirement(
    projectId: string,
    requirementId: string,
    updateRequirementDto: UpdateRequirementDto,
    actor: RequirementRevisionActor = systemRevisionActor,
  ): Promise<RequirementResponseDto> {
    await this.getProjectOrThrow(projectId);

    const requirement = await this.getRequirementOrThrow(
      projectId,
      requirementId,
    );


    const categoryChange = await this.prepareRequirementContentChange(
      projectId,
      requirement,
      updateRequirementDto,
    );

    if (updateRequirementDto.status !== undefined) {
      this.lifecycle.validateStatusChange(requirement, updateRequirementDto);
    }

    const revisionMetadata = this.createRequirementRevisionMetadata(
      requirement,
      updateRequirementDto,
      actor,
    );

    await this.revisions.storeCurrent(requirement, revisionMetadata);
    requirement.revisionNumber += 1;

    if (updateRequirementDto.status !== undefined) {
      this.lifecycle.applyStatusChange(requirement, updateRequirementDto);
    } else {
      this.applyRequirementContentChange(
        requirement,
        updateRequirementDto,
        categoryChange,
      );
    }
    this.revisions.applyCurrentMetadata(requirement, revisionMetadata);

    const savedRequirement =
      await this.requirementsRepository.save(requirement);

    return this.requirementMapper.fromRequirement(savedRequirement);
  }

  async listImplementationTickets(
    projectId: string,
    requirementId: string,
  ): Promise<ImplementationTicketResponseDto[]> {
    const project = await this.getProjectOrThrow(projectId);
    await this.getRequirementOrThrow(projectId, requirementId);
    const tickets = await this.implementationTicketsRepository.find({
      where: { requirementId },
      order: { ticketId: "ASC" },
    });
    return tickets.map((ticket) =>
      this.requirementMapper.fromImplementationTicket(
        ticket,
        project.ticketUrlTemplate,
      ),
    );
  }

  async createImplementationTicket(
    projectId: string,
    requirementId: string,
    dto: UpsertImplementationTicketDto,
    actor: RequirementRevisionActor = systemRevisionActor,
  ): Promise<ImplementationTicketResponseDto> {
    const project = await this.getProjectOrThrow(projectId);
    const requirement = await this.getRequirementOrThrow(
      projectId,
      requirementId,
    );
    this.assertTicketsEditable(requirement);
    await this.ensureTicketIdAvailable(requirementId, dto.ticketId);
    const revisionMetadata = createRevisionMetadata(
      RequirementRevisionChangeType.ImplementationTicketCreated,
      `Implementation ticket ${dto.ticketId} created.`,
      actor,
    );
    await this.revisions.storeCurrent(requirement, revisionMetadata);
    const ticket = this.implementationTicketsRepository.create({
      requirementId,
      ticketId: dto.ticketId,
      completedBy: dto.completedBy,
      completedAt: dto.completedAt,
    });
    const savedTicket = await this.implementationTicketsRepository.save(ticket);
    requirement.implementationTickets = [
      ...requirement.implementationTickets,
      savedTicket,
    ];
    requirement.revisionNumber += 1;
    this.revisions.applyCurrentMetadata(requirement, revisionMetadata);
    await this.requirementsRepository.save(requirement);
    return this.requirementMapper.fromImplementationTicket(
      savedTicket,
      project.ticketUrlTemplate,
    );
  }

  async updateImplementationTicket(
    projectId: string,
    requirementId: string,
    ticketRecordId: string,
    dto: UpsertImplementationTicketDto,
    actor: RequirementRevisionActor = systemRevisionActor,
  ): Promise<ImplementationTicketResponseDto> {
    const project = await this.getProjectOrThrow(projectId);
    const requirement = await this.getRequirementOrThrow(
      projectId,
      requirementId,
    );
    this.assertTicketsEditable(requirement);
    const ticket = await this.getImplementationTicketOrThrow(
      requirementId,
      ticketRecordId,
    );
    await this.ensureTicketIdAvailable(
      requirementId,
      dto.ticketId,
      ticketRecordId,
    );
    const revisionMetadata = createRevisionMetadata(
      RequirementRevisionChangeType.ImplementationTicketUpdated,
      `Implementation ticket ${dto.ticketId} updated.`,
      actor,
    );
    await this.revisions.storeCurrent(requirement, revisionMetadata);
    Object.assign(ticket, dto);
    const savedTicket = await this.implementationTicketsRepository.save(ticket);
    requirement.implementationTickets = requirement.implementationTickets.map(
      (item) => (item.id === savedTicket.id ? savedTicket : item),
    );
    requirement.revisionNumber += 1;
    this.revisions.applyCurrentMetadata(requirement, revisionMetadata);
    await this.requirementsRepository.save(requirement);
    return this.requirementMapper.fromImplementationTicket(
      savedTicket,
      project.ticketUrlTemplate,
    );
  }

  async deleteImplementationTicket(
    projectId: string,
    requirementId: string,
    ticketRecordId: string,
    actor: RequirementRevisionActor = systemRevisionActor,
  ): Promise<void> {
    await this.getProjectOrThrow(projectId);
    const requirement = await this.getRequirementOrThrow(
      projectId,
      requirementId,
    );
    this.assertTicketsEditable(requirement);
    const ticket = await this.getImplementationTicketOrThrow(requirementId, ticketRecordId);
    const revisionMetadata = createRevisionMetadata(
      RequirementRevisionChangeType.ImplementationTicketRemoved,
      `Implementation ticket ${ticket.ticketId} removed.`,
      actor,
    );
    await this.revisions.storeCurrent(requirement, revisionMetadata);
    await this.implementationTicketsRepository.delete({
      id: ticketRecordId,
      requirementId,
    });
    requirement.implementationTickets =
      requirement.implementationTickets.filter(
        (item) => item.id !== ticketRecordId,
      );
    requirement.revisionNumber += 1;
    this.revisions.applyCurrentMetadata(requirement, revisionMetadata);
    await this.requirementsRepository.save(requirement);
  }


  async findRequirementRevisions(
    projectId: string,
    requirementId: string,
  ): Promise<RequirementResponseDto[]> {
    await this.getProjectOrThrow(projectId);
    const requirement = await this.getRequirementOrThrow(
      projectId,
      requirementId,
    );
    const history = await this.revisions.findHistory(projectId, requirement);

    return history.map((revision) =>
      revision instanceof Requirement
        ? this.requirementMapper.fromRequirement(revision)
        : this.requirementMapper.fromRevision(revision),
    );
  }

  async compareRequirementRevisions(
    projectId: string,
    requirementId: string,
    fromRevision: number,
    toRevision: number,
  ): Promise<{
    readonly projectId: string;
    readonly requirementId: string;
    readonly fromRevision: number;
    readonly toRevision: number;
    readonly differences: readonly {
      readonly field: string;
      readonly from: unknown;
      readonly to: unknown;
    }[];
  }> {
    if (
      !Number.isInteger(fromRevision) ||
      !Number.isInteger(toRevision) ||
      fromRevision < 1 ||
      toRevision < 1
    ) {
      throw new BadRequestException(
        "Revision comparison requires positive integer revision numbers.",
      );
    }

    const snapshots = await this.findRequirementRevisions(
      projectId,
      requirementId,
    );
    const from = snapshots.find(
      (snapshot) => snapshot.revisionNumber === fromRevision,
    );
    const to = snapshots.find((snapshot) => snapshot.revisionNumber === toRevision);

    if (from === undefined || to === undefined) {
      throw new NotFoundException(
        `One or both requested revisions of requirement "${requirementId}" were not found.`,
      );
    }

    const comparedFields = [
      "categoryId",
      "sequenceNumber",
      "visibleKey",
      "status",
      "description",
      "priority",
      "owner",
      "rationale",
      "source",
      "rejectionReason",
      "reviewer",
      "obsoletedBy",
      "implementationTickets",
      "approvedAt",
      "implementedAt",
      "obsolescenceReason",
      "obsoleteAt",
      "rejectedAt",
    ] as const;

    return {
      projectId,
      requirementId,
      fromRevision,
      toRevision,
      differences: comparedFields
        .filter((field) => JSON.stringify(from[field]) !== JSON.stringify(to[field]))
        .map((field) => ({ field, from: from[field], to: to[field] })),
    };
  }

  private assertTicketsEditable(requirement: Requirement): void {
    if (requirement.status !== RequirementStatus.Approved) {
      throw new BadRequestException(
        "Implementation tickets can only be changed while the requirement is approved.",
      );
    }
  }

  private async ensureTicketIdAvailable(
    requirementId: string,
    ticketId: string,
    excludedId?: string,
  ): Promise<void> {
    const duplicate = await this.implementationTicketsRepository.findOne({
      where:
        excludedId === undefined
          ? { requirementId, ticketId }
          : { requirementId, ticketId, id: Not(excludedId) },
    });
    if (duplicate !== null)
      throw new BadRequestException(
        `Implementation ticket "${ticketId}" already exists for this requirement.`,
      );
  }

  private async getImplementationTicketOrThrow(
    requirementId: string,
    id: string,
  ): Promise<RequirementImplementationTicket> {
    const ticket = await this.implementationTicketsRepository.findOne({
      where: { id, requirementId },
    });
    if (ticket === null)
      throw new NotFoundException(
        `Implementation ticket with id "${id}" was not found.`,
      );
    return ticket;
  }

  private async getProjectOrThrow(projectId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (project === null) {
      throw new NotFoundException(
        `Project with id "${projectId}" was not found.`,
      );
    }

    return project;
  }

  private async getCategoryOrThrow(
    projectId: string,
    categoryId: string,
  ): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId, projectId },
    });

    if (category === null) {
      throw new NotFoundException(
        `Category with id "${categoryId}" in project "${projectId}" was not found.`,
      );
    }

    return category;
  }

  private async getRequirementOrThrow(
    projectId: string,
    requirementId: string,
  ): Promise<Requirement> {
    const requirement = await this.requirementsRepository.findOne({
      where: { id: requirementId, projectId },
    });

    if (requirement === null) {
      throw new NotFoundException(
        `Requirement with id "${requirementId}" in project "${projectId}" was not found.`,
      );
    }

    return requirement;
  }

  private async ensureCategoryNameAvailable(
    projectId: string,
    name: string,
    excludedCategoryId?: string,
  ): Promise<void> {
    const duplicateCategory = await this.categoriesRepository.findOne({
      where:
        excludedCategoryId === undefined
          ? { projectId, name }
          : { projectId, name, id: Not(excludedCategoryId) },
    });

    if (duplicateCategory !== null) {
      throw new BadRequestException(
        `Category name "${name}" already exists in this project.`,
      );
    }
  }

  private async ensureCategoryKeyAvailable(
    projectId: string,
    key: string,
    excludedCategoryId?: string,
  ): Promise<void> {
    const duplicateCategory = await this.categoriesRepository.findOne({
      where:
        excludedCategoryId === undefined
          ? { projectId, key }
          : { projectId, key, id: Not(excludedCategoryId) },
    });

    if (duplicateCategory !== null) {
      throw new BadRequestException(
        `Category key "${key}" already exists in this project.`,
      );
    }
  }

  private async getNextRequirementSequenceNumber(
    projectId: string,
    categoryId: string,
  ): Promise<number> {
    const latestRequirement = await this.requirementsRepository.findOne({
      where: { projectId, categoryId },
      order: { sequenceNumber: "DESC" },
    });
    const sequenceNumber = (latestRequirement?.sequenceNumber ?? 0) + 1;

    if (sequenceNumber > MAX_REQUIREMENT_SEQUENCE_NUMBER) {
      throw new BadRequestException(
        "No more requirement keys are available for this category.",
      );
    }

    return sequenceNumber;
  }

  private buildVisibleKey(category: Category, sequenceNumber: number): string {
    return `${category.type}-${category.key}-${sequenceNumber.toString().padStart(4, "0")}`;
  }


  private createRequirementRevisionMetadata(
    requirement: Requirement,
    update: UpdateRequirementDto,
    actor: RequirementRevisionActor,
  ): RequirementRevisionMetadata {
    if (update.status !== undefined) {
      return createRevisionMetadata(
        statusChangeType(update),
        statusChangeReason(update),
        actor,
      );
    }

    return createRevisionMetadata(
      update.categoryId !== undefined && update.categoryId !== requirement.categoryId
        ? RequirementRevisionChangeType.CategoryChanged
        : RequirementRevisionChangeType.ContentChanged,
      update.categoryId !== undefined && update.categoryId !== requirement.categoryId
        ? "Requirement category changed."
        : "Requirement content changed.",
      actor,
    );
  }

  private async prepareRequirementContentChange(
    projectId: string,
    requirement: Requirement,
    updateRequirementDto: UpdateRequirementDto,
  ): Promise<
    Readonly<{ category: Category; sequenceNumber: number }> | undefined
  > {
    if (updateRequirementDto.status !== undefined) {
      return undefined;
    }

    if (
      requirement.status !== RequirementStatus.Draft &&
      requirement.status !== RequirementStatus.Approved
    ) {
      throw new BadRequestException(
        `Requirement in status "${requirement.status}" cannot be changed.`,
      );
    }

    if (
      updateRequirementDto.categoryId === undefined ||
      updateRequirementDto.categoryId === requirement.categoryId
    ) {
      return undefined;
    }

    const category = await this.getCategoryOrThrow(
      projectId,
      updateRequirementDto.categoryId,
    );
    const sequenceNumber = await this.getNextRequirementSequenceNumber(
      projectId,
      category.id,
    );

    return { category, sequenceNumber };
  }

  private applyRequirementContentChange(
    requirement: Requirement,
    updateRequirementDto: UpdateRequirementDto,
    categoryChange:
      | Readonly<{ category: Category; sequenceNumber: number }>
      | undefined,
  ): void {
    if (categoryChange !== undefined) {
      requirement.categoryId = categoryChange.category.id;
      requirement.sequenceNumber = categoryChange.sequenceNumber;
      requirement.visibleKey = this.buildVisibleKey(
        categoryChange.category,
        categoryChange.sequenceNumber,
      );
    }

    for (const fieldName of CONTENT_FIELD_NAMES) {
      if (
        fieldName !== "categoryId" &&
        updateRequirementDto[fieldName] !== undefined
      ) {
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
}
