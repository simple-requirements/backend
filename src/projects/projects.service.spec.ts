import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, type TestingModule } from "@nestjs/testing";
import { Not } from "typeorm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Category } from "@/projects/categories.entity";
import type { CreateCategoryDto } from "@/projects/dto/create-category.dto";
import type { UpdateCategoryDto } from "@/projects/dto/update-category.dto";
import type { CreateRequirementDto } from "@/projects/dto/create-requirement.dto";
import type { UpdateRequirementDto } from "@/projects/dto/update-requirement.dto";
import { Project } from "@/projects/projects.entity";
import { RequirementRevision } from "@/projects/requirement-revisions.entity";
import { RequirementStatus } from "@/projects/requirement-status.enum";
import { Requirement } from "@/projects/requirements.entity";
import { RequirementImplementationTicket } from "@/projects/requirement-implementation-ticket.entity";
import { ProjectsService } from "@/projects/projects.service";
import { CategoryType } from "@/projects/category-type.enum";
import { RequirementLifecycleService } from "@/projects/requirements/requirement-lifecycle.service";
import { RequirementResponseMapper } from "@/projects/requirements/requirement-response.mapper";
import { RequirementRevisionService } from "@/projects/requirements/requirement-revision.service";

interface ProjectsRepositoryMock {
  create: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

interface CategoriesRepositoryMock {
  create: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

interface RequirementsRepositoryMock {
  create: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

interface RequirementRevisionsRepositoryMock {
  create: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

type ImplementationTicketsRepositoryMock = RequirementsRepositoryMock;

const PROJECT_ID = "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b";
const CATEGORY_ID = "2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d10";
const REQUIREMENT_ID = "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11";

function createProjectEntity(overrides: Partial<Project> = {}): Project {
  const project = new Project();

  project.id = PROJECT_ID;
  project.name = "Test project";
  project.createdAt = new Date("2026-06-28T10:00:00.000Z");
  project.updatedAt = new Date("2026-06-28T10:00:00.000Z");
  project.categories = [];
  project.requirements = [];

  return Object.assign(project, overrides);
}

function createCategoryEntity(overrides: Partial<Category> = {}): Category {
  const category = new Category();

  category.id = CATEGORY_ID;
  category.projectId = PROJECT_ID;
  category.name = "Authentication";
  category.key = "AUTH";
  category.type = CategoryType.FR;
  category.createdAt = new Date("2026-06-28T10:00:00.000Z");
  category.updatedAt = new Date("2026-06-28T10:00:00.000Z");

  return Object.assign(category, overrides);
}

function createCreateCategoryDto(
  overrides: Partial<CreateCategoryDto> = {},
): CreateCategoryDto {
  return {
    name: "Authentication",
    key: "AUTH",
    type: CategoryType.FR,
    ...overrides,
  };
}

// Separate factory keeps create/update DTO tests type-safe although their current shapes match.
// eslint-disable-next-line sonarjs/no-identical-functions
function createUpdateCategoryDto(
  overrides: Partial<UpdateCategoryDto> = {},
): UpdateCategoryDto {
  return {
    name: "Authentication",
    key: "AUTH",
    type: CategoryType.FR,
    ...overrides,
  };
}

function createRequirementEntity(
  overrides: Partial<Requirement> = {},
): Requirement {
  const requirement = new Requirement();

  requirement.id = REQUIREMENT_ID;
  requirement.projectId = PROJECT_ID;
  requirement.categoryId = CATEGORY_ID;
  requirement.sequenceNumber = 1;
  requirement.visibleKey = "FR-AUTH-0001";
  requirement.revisionNumber = 1;
  requirement.status = RequirementStatus.Draft;
  requirement.description = "Users must sign in.";
  requirement.priority = "p1";
  requirement.owner = "Product Owner";
  requirement.rationale = "Protect data.";
  requirement.source = "Workshop";
  requirement.rejectionReason = null;
  requirement.reviewer = null;
  requirement.obsoletedBy = null;
  requirement.rejectedAt = null;
  requirement.deletedAt = null;
  requirement.approvedAt = null;
  requirement.implementedAt = null;
  requirement.obsolescenceReason = null;
  requirement.obsoleteAt = null;
  requirement.createdAt = new Date("2026-06-28T10:00:00.000Z");
  requirement.updatedAt = new Date("2026-06-28T10:00:00.000Z");
  requirement.revisions = [];
  requirement.implementationTickets = [];
  requirement.project = createProjectEntity();

  return Object.assign(requirement, overrides);
}

function createRequirementRevisionEntity(
  overrides: Partial<RequirementRevision> = {},
): RequirementRevision {
  const revision = new RequirementRevision();

  revision.id = "5a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d13";
  revision.requirementId = REQUIREMENT_ID;
  revision.projectId = PROJECT_ID;
  revision.categoryId = CATEGORY_ID;
  revision.sequenceNumber = 1;
  revision.visibleKey = "FR-AUTH-0001";
  revision.revisionNumber = 1;
  revision.status = RequirementStatus.Draft;
  revision.description = "Users must sign in.";
  revision.priority = "p1";
  revision.owner = "Product Owner";
  revision.rationale = "Protect data.";
  revision.source = "Workshop";
  revision.rejectionReason = null;
  revision.reviewer = null;
  revision.obsoletedBy = null;
  revision.rejectedAt = null;
  revision.deletedAt = null;
  revision.approvedAt = null;
  revision.implementedAt = null;
  revision.obsolescenceReason = null;
  revision.obsoleteAt = null;
  revision.createdAt = new Date("2026-06-28T10:00:00.000Z");
  revision.updatedAt = new Date("2026-06-28T10:00:00.000Z");
  revision.implementationTickets = [];

  return Object.assign(revision, overrides);
}

function createCreateRequirementDto(
  overrides: Partial<CreateRequirementDto> = {},
): CreateRequirementDto {
  return {
    categoryId: CATEGORY_ID,
    description: "Users must sign in.",
    priority: "p1",
    ...overrides,
  };
}

function createUpdateRequirementDto(
  overrides: Partial<UpdateRequirementDto> = {},
): UpdateRequirementDto {
  return { description: "Users must sign in with MFA.", ...overrides };
}

describe("ProjectsService", () => {
  let service: ProjectsService;
  let projectsRepository: ProjectsRepositoryMock;
  let categoriesRepository: CategoriesRepositoryMock;
  let requirementsRepository: RequirementsRepositoryMock;
  let requirementRevisionsRepository: RequirementRevisionsRepositoryMock;
  let implementationTicketsRepository: ImplementationTicketsRepositoryMock;

  beforeAll(async () => {
    projectsRepository = {
      create: vi.fn(),
      delete: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
    };
    categoriesRepository = {
      create: vi.fn(),
      delete: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
    };
    requirementsRepository = {
      create: vi.fn(),
      delete: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
    };
    requirementRevisionsRepository = {
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
    };
    implementationTicketsRepository = {
      create: vi.fn(),
      delete: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        RequirementLifecycleService,
        RequirementResponseMapper,
        RequirementRevisionService,
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        {
          provide: getRepositoryToken(Category),
          useValue: categoriesRepository,
        },
        {
          provide: getRepositoryToken(Requirement),
          useValue: requirementsRepository,
        },
        {
          provide: getRepositoryToken(RequirementRevision),
          useValue: requirementRevisionsRepository,
        },
        {
          provide: getRepositoryToken(RequirementImplementationTicket),
          useValue: implementationTicketsRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("finds", () => {
    it("a project by id.", async () => {
      const project = createProjectEntity({
        id: PROJECT_ID,
        name: "Test project",
      });

      projectsRepository.findOne.mockResolvedValue(project);

      const result = await service.findOne(PROJECT_ID);

      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: PROJECT_ID },
      });
      expect(result).toEqual({
        id: PROJECT_ID,
        name: "Test project",
        createdAt: new Date("2026-06-28T10:00:00.000Z"),
        updatedAt: new Date("2026-06-28T10:00:00.000Z"),
      });
    });

    it("throws NotFoundException if the project does not exist.", async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(PROJECT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: PROJECT_ID },
      });
    });

    it("all projects ordered by name.", async () => {
      const alphaProject = createProjectEntity({
        id: "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2a",
        name: "Alpha project",
      });

      const betaProject = createProjectEntity({
        id: "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b",
        name: "Beta project",
      });

      projectsRepository.find.mockResolvedValue([alphaProject, betaProject]);

      const result = await service.findAll();

      expect(projectsRepository.find).toHaveBeenCalledWith({
        order: { name: "ASC" },
      });

      expect(result).toEqual([
        {
          id: "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2a",
          name: "Alpha project",
          createdAt: new Date("2026-06-28T10:00:00.000Z"),
          updatedAt: new Date("2026-06-28T10:00:00.000Z"),
        },
        {
          id: "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b",
          name: "Beta project",
          createdAt: new Date("2026-06-28T10:00:00.000Z"),
          updatedAt: new Date("2026-06-28T10:00:00.000Z"),
        },
      ]);
    });
  });

  describe("creates", () => {
    it("a project.", async () => {
      const createdProject = createProjectEntity({
        id: undefined,
        name: "Test project",
        createdAt: undefined,
        updatedAt: undefined,
      });

      const savedProject = createProjectEntity();

      projectsRepository.create.mockReturnValue(createdProject);
      projectsRepository.save.mockResolvedValue(savedProject);

      const result = await service.create({ name: "Test project" });

      expect(projectsRepository.create).toHaveBeenCalledWith({
        name: "Test project",
        ticketUrlTemplate: null,
      });
      expect(projectsRepository.save).toHaveBeenCalledWith(createdProject);

      expect(result).toEqual({
        id: "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b",
        name: "Test project",
        createdAt: new Date("2026-06-28T10:00:00.000Z"),
        updatedAt: new Date("2026-06-28T10:00:00.000Z"),
      });
    });
  });

  describe("updates", () => {
    it("a project.", async () => {
      const projectId = "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b";

      const existingProject = createProjectEntity({
        id: projectId,
        name: "Old project name",
      });

      const savedProject = createProjectEntity({
        id: projectId,
        name: "New project name",
        updatedAt: new Date("2026-06-28T11:00:00.000Z"),
      });

      projectsRepository.findOne.mockResolvedValue(existingProject);
      projectsRepository.save.mockResolvedValue(savedProject);

      const result = await service.update(projectId, {
        name: "New project name",
      });

      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(existingProject.name).toBe("New project name");
      expect(projectsRepository.save).toHaveBeenCalledWith(existingProject);

      expect(result).toEqual({
        id: projectId,
        name: "New project name",
        createdAt: new Date("2026-06-28T10:00:00.000Z"),
        updatedAt: new Date("2026-06-28T11:00:00.000Z"),
      });
    });

    it("throws NotFoundException if the project does not exist.", async () => {
      const projectId = "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b";

      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(projectId, { name: "New project name" }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(projectsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("deletes", () => {
    it("a project.", async () => {
      const projectId = "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b";

      projectsRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(projectId);

      expect(projectsRepository.delete).toHaveBeenCalledWith({ id: projectId });
    });

    it("throws NotFoundException if the project does not exist.", async () => {
      const projectId = "9d9a0e08-9e30-4f0a-8c65-8f5d7c1f3a2b";

      projectsRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.delete(projectId)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(projectsRepository.delete).toHaveBeenCalledWith({ id: projectId });
    });
  });

  describe("categories", () => {
    describe("findAllCategories", () => {
      it("returns all categories of a project sorted by name.", async () => {
        const alphaCategory = createCategoryEntity({
          id: "2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
          name: "Authentication",
          key: "AUTH",
          type: CategoryType.FR,
        });

        const betaCategory = createCategoryEntity({
          id: "2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12",
          name: "Reporting",
          key: "RPT",
          type: CategoryType.NFR,
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.find.mockResolvedValue([
          alphaCategory,
          betaCategory,
        ]);

        const result = await service.findAllCategories(PROJECT_ID);

        expect(projectsRepository.findOne).toHaveBeenCalledWith({
          where: { id: PROJECT_ID },
        });
        expect(categoriesRepository.find).toHaveBeenCalledWith({
          where: { projectId: PROJECT_ID },
          order: { name: "ASC" },
        });

        expect(result).toEqual([
          {
            id: "2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
            projectId: PROJECT_ID,
            name: "Authentication",
            key: "AUTH",
            type: CategoryType.FR,
            createdAt: new Date("2026-06-28T10:00:00.000Z"),
            updatedAt: new Date("2026-06-28T10:00:00.000Z"),
          },
          {
            id: "2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12",
            projectId: PROJECT_ID,
            name: "Reporting",
            key: "RPT",
            type: CategoryType.NFR,
            createdAt: new Date("2026-06-28T10:00:00.000Z"),
            updatedAt: new Date("2026-06-28T10:00:00.000Z"),
          },
        ]);
      });

      it("returns an empty array when the project exists but has no categories.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.find.mockResolvedValue([]);

        const result = await service.findAllCategories(PROJECT_ID);

        expect(projectsRepository.findOne).toHaveBeenCalledWith({
          where: { id: PROJECT_ID },
        });
        expect(categoriesRepository.find).toHaveBeenCalledWith({
          where: { projectId: PROJECT_ID },
          order: { name: "ASC" },
        });

        expect(result).toEqual([]);
      });

      describe("throws", () => {
        it("NotFoundException when the project does not exist.", async () => {
          projectsRepository.findOne.mockResolvedValue(null);

          await expect(
            service.findAllCategories(PROJECT_ID),
          ).rejects.toBeInstanceOf(NotFoundException);

          expect(projectsRepository.findOne).toHaveBeenCalledWith({
            where: { id: PROJECT_ID },
          });
          expect(categoriesRepository.find).not.toHaveBeenCalled();
        });
      });
    });

    describe("createCategory", () => {
      it("creates a category for an existing project.", async () => {
        const createdCategory = createCategoryEntity({
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        });

        const savedCategory = createCategoryEntity();

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.findOne.mockResolvedValue(null);
        categoriesRepository.create.mockReturnValue(createdCategory);
        categoriesRepository.save.mockResolvedValue(savedCategory);

        const result = await service.createCategory(
          PROJECT_ID,
          createCreateCategoryDto(),
        );

        expect(projectsRepository.findOne).toHaveBeenCalledWith({
          where: { id: PROJECT_ID },
        });
        expect(categoriesRepository.create).toHaveBeenCalledWith({
          projectId: PROJECT_ID,
          name: "Authentication",
          key: "AUTH",
          type: CategoryType.FR,
        });
        expect(categoriesRepository.save).toHaveBeenCalledWith(createdCategory);

        expect(result).toEqual({
          id: CATEGORY_ID,
          projectId: PROJECT_ID,
          name: "Authentication",
          key: "AUTH",
          type: CategoryType.FR,
          createdAt: new Date("2026-06-28T10:00:00.000Z"),
          updatedAt: new Date("2026-06-28T10:00:00.000Z"),
        });
      });

      describe("throws", () => {
        it("NotFoundException when the project does not exist.", async () => {
          projectsRepository.findOne.mockResolvedValue(null);

          await expect(
            service.createCategory(PROJECT_ID, createCreateCategoryDto()),
          ).rejects.toBeInstanceOf(NotFoundException);

          expect(projectsRepository.findOne).toHaveBeenCalledWith({
            where: { id: PROJECT_ID },
          });
          expect(categoriesRepository.findOne).not.toHaveBeenCalled();
          expect(categoriesRepository.create).not.toHaveBeenCalled();
          expect(categoriesRepository.save).not.toHaveBeenCalled();
        });
        it("BadRequestException when the category name already exists in the project.", async () => {
          const duplicateCategory = createCategoryEntity({
            id: "2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12",
            name: "Authentication",
            key: "SEC",
          });

          projectsRepository.findOne.mockResolvedValue(createProjectEntity());
          categoriesRepository.findOne.mockResolvedValueOnce(duplicateCategory);

          await expect(
            service.createCategory(PROJECT_ID, createCreateCategoryDto()),
          ).rejects.toBeInstanceOf(BadRequestException);

          expect(categoriesRepository.findOne).toHaveBeenCalledWith({
            where: { projectId: PROJECT_ID, name: "Authentication" },
          });
          expect(categoriesRepository.create).not.toHaveBeenCalled();
          expect(categoriesRepository.save).not.toHaveBeenCalled();
        });

        it("BadRequestException when the category key already exists in the project.", async () => {
          const duplicateCategory = createCategoryEntity({
            id: "2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12",
            name: "Security",
            key: "AUTH",
          });

          projectsRepository.findOne.mockResolvedValue(createProjectEntity());
          categoriesRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(duplicateCategory);

          await expect(
            service.createCategory(PROJECT_ID, createCreateCategoryDto()),
          ).rejects.toBeInstanceOf(BadRequestException);

          expect(categoriesRepository.findOne).toHaveBeenCalledWith({
            where: { projectId: PROJECT_ID, name: "Authentication" },
          });
          expect(categoriesRepository.findOne).toHaveBeenCalledWith({
            where: { projectId: PROJECT_ID, key: "AUTH" },
          });
          expect(categoriesRepository.create).not.toHaveBeenCalled();
          expect(categoriesRepository.save).not.toHaveBeenCalled();
        });
      });
    });

    describe("updateCategory", () => {
      it("updates the category name.", async () => {
        const existingCategory = createCategoryEntity({ name: "Old name" });
        const savedCategory = createCategoryEntity({
          name: "New name",
          updatedAt: new Date("2026-06-28T11:00:00.000Z"),
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.findOne
          .mockResolvedValueOnce(existingCategory)
          .mockResolvedValueOnce(null);
        categoriesRepository.save.mockResolvedValue(savedCategory);

        const result = await service.updateCategory(PROJECT_ID, CATEGORY_ID, {
          name: "New name",
        });

        expect(categoriesRepository.findOne).toHaveBeenCalledWith({
          where: { id: CATEGORY_ID, projectId: PROJECT_ID },
        });
        expect(categoriesRepository.findOne).toHaveBeenCalledWith({
          where: {
            projectId: PROJECT_ID,
            name: "New name",
            id: Not(CATEGORY_ID),
          },
        });
        expect(existingCategory.name).toBe("New name");
        expect(categoriesRepository.save).toHaveBeenCalledWith(
          existingCategory,
        );

        expect(result).toEqual({
          id: CATEGORY_ID,
          projectId: PROJECT_ID,
          name: "New name",
          key: "AUTH",
          type: CategoryType.FR,
          createdAt: new Date("2026-06-28T10:00:00.000Z"),
          updatedAt: new Date("2026-06-28T11:00:00.000Z"),
        });
      });

      it("updates the category key.", async () => {
        const existingCategory = createCategoryEntity({ key: "AUTH" });
        const savedCategory = createCategoryEntity({
          key: "SEC",
          updatedAt: new Date("2026-06-28T11:00:00.000Z"),
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.findOne
          .mockResolvedValueOnce(existingCategory)
          .mockResolvedValueOnce(null);
        categoriesRepository.save.mockResolvedValue(savedCategory);

        await service.updateCategory(PROJECT_ID, CATEGORY_ID, { key: "SEC" });

        expect(existingCategory.key).toBe("SEC");
        expect(categoriesRepository.save).toHaveBeenCalledWith(
          existingCategory,
        );
      });

      it("updates the category type.", async () => {
        const existingCategory = createCategoryEntity({
          type: CategoryType.FR,
        });
        const savedCategory = createCategoryEntity({
          type: CategoryType.NFR,
          updatedAt: new Date("2026-06-28T11:00:00.000Z"),
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.findOne.mockResolvedValueOnce(existingCategory);
        categoriesRepository.save.mockResolvedValue(savedCategory);

        await service.updateCategory(PROJECT_ID, CATEGORY_ID, {
          type: CategoryType.NFR,
        });

        expect(existingCategory.type).toBe(CategoryType.NFR);
        expect(categoriesRepository.save).toHaveBeenCalledWith(
          existingCategory,
        );
      });

      it("updates name, key, and type together.", async () => {
        const existingCategory = createCategoryEntity({
          name: "Old name",
          key: "OLD",
          type: CategoryType.FR,
        });

        const savedCategory = createCategoryEntity({
          name: "New name",
          key: "NEW",
          type: CategoryType.NFR,
          updatedAt: new Date("2026-06-28T11:00:00.000Z"),
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.findOne
          .mockResolvedValueOnce(existingCategory)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        categoriesRepository.save.mockResolvedValue(savedCategory);

        const result = await service.updateCategory(
          PROJECT_ID,
          CATEGORY_ID,
          createUpdateCategoryDto({
            name: "New name",
            key: "NEW",
            type: CategoryType.NFR,
          }),
        );

        expect(existingCategory.name).toBe("New name");
        expect(existingCategory.key).toBe("NEW");
        expect(existingCategory.type).toBe(CategoryType.NFR);
        expect(categoriesRepository.save).toHaveBeenCalledWith(
          existingCategory,
        );

        expect(result).toEqual({
          id: CATEGORY_ID,
          projectId: PROJECT_ID,
          name: "New name",
          key: "NEW",
          type: CategoryType.NFR,
          createdAt: new Date("2026-06-28T10:00:00.000Z"),
          updatedAt: new Date("2026-06-28T11:00:00.000Z"),
        });
      });

      it("allows keeping the same name and key on the same category.", async () => {
        const existingCategory = createCategoryEntity({
          name: "Authentication",
          key: "AUTH",
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.findOne
          .mockResolvedValueOnce(existingCategory)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        categoriesRepository.save.mockResolvedValue(existingCategory);

        await service.updateCategory(
          PROJECT_ID,
          CATEGORY_ID,
          createUpdateCategoryDto({ name: "Authentication", key: "AUTH" }),
        );

        expect(categoriesRepository.save).toHaveBeenCalledWith(
          existingCategory,
        );
      });

      describe("throws", () => {
        it("NotFoundException when the project does not exist.", async () => {
          projectsRepository.findOne.mockResolvedValue(null);

          await expect(
            service.updateCategory(
              PROJECT_ID,
              CATEGORY_ID,
              createUpdateCategoryDto(),
            ),
          ).rejects.toBeInstanceOf(NotFoundException);

          expect(projectsRepository.findOne).toHaveBeenCalledWith({
            where: { id: PROJECT_ID },
          });
          expect(categoriesRepository.findOne).not.toHaveBeenCalled();
          expect(categoriesRepository.save).not.toHaveBeenCalled();
        });

        it("NotFoundException when the category does not exist in the project.", async () => {
          projectsRepository.findOne.mockResolvedValue(createProjectEntity());
          categoriesRepository.findOne.mockResolvedValue(null);

          await expect(
            service.updateCategory(
              PROJECT_ID,
              CATEGORY_ID,
              createUpdateCategoryDto(),
            ),
          ).rejects.toBeInstanceOf(NotFoundException);

          expect(categoriesRepository.findOne).toHaveBeenCalledWith({
            where: { id: CATEGORY_ID, projectId: PROJECT_ID },
          });
          expect(categoriesRepository.save).not.toHaveBeenCalled();
        });

        it("BadRequestException when the updated name already exists in the same project.", async () => {
          const existingCategory = createCategoryEntity({
            id: CATEGORY_ID,
            name: "Authentication",
          });

          const duplicateCategory = createCategoryEntity({
            id: "2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12",
            name: "Security",
          });

          projectsRepository.findOne.mockResolvedValue(createProjectEntity());
          categoriesRepository.findOne
            .mockResolvedValueOnce(existingCategory)
            .mockResolvedValueOnce(duplicateCategory);

          await expect(
            service.updateCategory(PROJECT_ID, CATEGORY_ID, {
              name: "Security",
            }),
          ).rejects.toBeInstanceOf(BadRequestException);

          expect(categoriesRepository.save).not.toHaveBeenCalled();
        });

        it("BadRequestException when the updated key already exists in the same project.", async () => {
          const existingCategory = createCategoryEntity({
            id: CATEGORY_ID,
            key: "AUTH",
          });

          const duplicateCategory = createCategoryEntity({
            id: "2d7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12",
            key: "SEC",
          });

          projectsRepository.findOne.mockResolvedValue(createProjectEntity());
          categoriesRepository.findOne
            .mockResolvedValueOnce(existingCategory)
            .mockResolvedValueOnce(duplicateCategory);

          await expect(
            service.updateCategory(PROJECT_ID, CATEGORY_ID, { key: "SEC" }),
          ).rejects.toBeInstanceOf(BadRequestException);

          expect(categoriesRepository.save).not.toHaveBeenCalled();
        });
      });
    });

    describe("deleteCategory", () => {
      it("deletes a category from an existing project.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.delete.mockResolvedValue({ affected: 1 });

        await service.deleteCategory(PROJECT_ID, CATEGORY_ID);

        expect(projectsRepository.findOne).toHaveBeenCalledWith({
          where: { id: PROJECT_ID },
        });
        expect(categoriesRepository.delete).toHaveBeenCalledWith({
          id: CATEGORY_ID,
          projectId: PROJECT_ID,
        });
      });

      describe("throws", () => {
        it("NotFoundException when the project does not exist.", async () => {
          projectsRepository.findOne.mockResolvedValue(null);

          await expect(
            service.deleteCategory(PROJECT_ID, CATEGORY_ID),
          ).rejects.toBeInstanceOf(NotFoundException);

          expect(projectsRepository.findOne).toHaveBeenCalledWith({
            where: { id: PROJECT_ID },
          });
          expect(categoriesRepository.delete).not.toHaveBeenCalled();
        });

        it("NotFoundException when the category does not exist in the project.", async () => {
          projectsRepository.findOne.mockResolvedValue(createProjectEntity());
          categoriesRepository.delete.mockResolvedValue({ affected: 0 });

          await expect(
            service.deleteCategory(PROJECT_ID, CATEGORY_ID),
          ).rejects.toBeInstanceOf(NotFoundException);

          expect(categoriesRepository.delete).toHaveBeenCalledWith({
            id: CATEGORY_ID,
            projectId: PROJECT_ID,
          });
        });
      });
    });
  });

  describe("requirements", () => {
    describe("createRequirement", () => {
      it("creates a draft requirement with an allocated visible key.", async () => {
        const project = createProjectEntity();
        const category = createCategoryEntity({
          type: CategoryType.NFR,
          key: "PERF",
        });
        const createdRequirement = createRequirementEntity({
          id: undefined,
          categoryId: category.id,
          sequenceNumber: 1,
          visibleKey: "NFR-PERF-0001",
          revisionNumber: 1,
          status: RequirementStatus.Draft,
          createdAt: undefined,
          updatedAt: undefined,
        });
        const savedRequirement = createRequirementEntity({
          categoryId: category.id,
          sequenceNumber: 1,
          visibleKey: "NFR-PERF-0001",
          revisionNumber: 1,
          status: RequirementStatus.Draft,
          implementationTickets: undefined,
        });

        projectsRepository.findOne.mockResolvedValue(project);
        categoriesRepository.findOne.mockResolvedValue(category);
        requirementsRepository.findOne.mockResolvedValue(null);
        requirementsRepository.create.mockReturnValue(createdRequirement);
        requirementsRepository.save.mockResolvedValue(savedRequirement);

        const result = await service.createRequirement(
          PROJECT_ID,
          createCreateRequirementDto({
            categoryId: CATEGORY_ID,
            description: "Fast search",
            priority: "p2",
          }),
        );

        expect(projectsRepository.findOne).toHaveBeenCalledWith({
          where: { id: PROJECT_ID },
        });
        expect(categoriesRepository.findOne).toHaveBeenCalledWith({
          where: { id: CATEGORY_ID, projectId: PROJECT_ID },
        });
        expect(requirementsRepository.findOne).toHaveBeenCalledWith({
          where: { projectId: PROJECT_ID, categoryId: CATEGORY_ID },
          order: { sequenceNumber: "DESC" },
        });
        expect(requirementsRepository.create).toHaveBeenCalledWith({
          projectId: PROJECT_ID,
          categoryId: CATEGORY_ID,
          sequenceNumber: 1,
          visibleKey: "NFR-PERF-0001",
          revisionNumber: 1,
          status: RequirementStatus.Draft,
          description: "Fast search",
          priority: "p2",
          owner: null,
          rationale: null,
          source: null,
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
        expect(requirementsRepository.save).toHaveBeenCalledWith(
          createdRequirement,
        );
        expect(result.visibleKey).toBe("NFR-PERF-0001");
        expect(result.status).toBe(RequirementStatus.Draft);
        expect(result.implementationTickets).toEqual([]);
      });

      it("throws NotFoundException if the category belongs to another project.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        categoriesRepository.findOne.mockResolvedValue(null);

        await expect(
          service.createRequirement(PROJECT_ID, createCreateRequirementDto()),
        ).rejects.toBeInstanceOf(NotFoundException);

        expect(requirementsRepository.create).not.toHaveBeenCalled();
        expect(requirementsRepository.save).not.toHaveBeenCalled();
      });
    });

    describe("findAllRequirements", () => {
      it("lists visible requirements sorted by visible key.", async () => {
        const firstRequirement = createRequirementEntity({
          visibleKey: "FR-AUTH-0001",
        });
        const secondRequirement = createRequirementEntity({
          id: "4a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12",
          visibleKey: "FR-AUTH-0002",
          sequenceNumber: 2,
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.find.mockResolvedValue([
          firstRequirement,
          secondRequirement,
        ]);

        const result = await service.findAllRequirements(PROJECT_ID, false);

        expect(requirementsRepository.find).toHaveBeenCalledWith({
          where: { projectId: PROJECT_ID, deletedAt: expect.any(Object) },
          order: { visibleKey: "ASC" },
        });
        expect(result.map((requirement) => requirement.visibleKey)).toEqual([
          "FR-AUTH-0001",
          "FR-AUTH-0002",
        ]);
      });
    });

    describe("findRequirement", () => {
      it("returns the current requirement when no revision query is provided.", async () => {
        const requirement = createRequirementEntity({
          revisionNumber: 3,
          description: "Current text.",
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(requirement);

        const result = await service.findRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
        );

        expect(requirementsRepository.findOne).toHaveBeenCalledWith({
          where: { id: REQUIREMENT_ID, projectId: PROJECT_ID },
        });
        expect(requirementRevisionsRepository.findOne).not.toHaveBeenCalled();
        expect(result).toMatchObject({
          id: REQUIREMENT_ID,
          revisionNumber: 3,
          description: "Current text.",
        });
      });

      it("returns a stored requirement revision by revision number.", async () => {
        const currentRequirement = createRequirementEntity({
          revisionNumber: 3,
        });
        const revision = createRequirementRevisionEntity({
          revisionNumber: 2,
          status: RequirementStatus.Approved,
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(currentRequirement);
        requirementRevisionsRepository.findOne.mockResolvedValue(revision);

        const result = await service.findRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
          {
            revision: 2,
            allrevisions: false,
          },
        );

        expect(requirementRevisionsRepository.findOne).toHaveBeenCalledWith({
          where: {
            requirementId: REQUIREMENT_ID,
            projectId: PROJECT_ID,
            revisionNumber: 2,
          },
        });
        expect(result).toMatchObject({
          id: REQUIREMENT_ID,
          revisionNumber: 2,
          status: RequirementStatus.Approved,
        });
      });

      it("returns the current requirement when the requested revision is current.", async () => {
        const currentRequirement = createRequirementEntity({
          revisionNumber: 3,
          description: "Current text.",
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(currentRequirement);

        const result = await service.findRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
          {
            revision: 3,
            allrevisions: false,
          },
        );

        expect(requirementRevisionsRepository.findOne).not.toHaveBeenCalled();
        expect(result).toMatchObject({
          id: REQUIREMENT_ID,
          revisionNumber: 3,
          description: "Current text.",
        });
      });

      it("returns all stored historical revisions of a requirement.", async () => {
        const currentRequirement = createRequirementEntity({
          revisionNumber: 3,
        });
        const firstRevision = createRequirementRevisionEntity({
          revisionNumber: 1,
        });
        const secondRevision = createRequirementRevisionEntity({
          id: "6a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d14",
          revisionNumber: 2,
          status: RequirementStatus.Approved,
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(currentRequirement);
        requirementRevisionsRepository.find.mockResolvedValue([
          firstRevision,
          secondRevision,
        ]);

        const result = await service.findRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
          { allrevisions: true },
        );

        expect(requirementRevisionsRepository.find).toHaveBeenCalledWith({
          where: { requirementId: REQUIREMENT_ID, projectId: PROJECT_ID },
          order: { revisionNumber: "ASC" },
        });
        expect(Array.isArray(result)).toBe(true);
        expect(result).toMatchObject([
          {
            id: REQUIREMENT_ID,
            revisionNumber: 1,
            status: RequirementStatus.Draft,
          },
          {
            id: REQUIREMENT_ID,
            revisionNumber: 2,
            status: RequirementStatus.Approved,
          },
        ]);
      });

      it("throws NotFoundException when the requested revision does not exist.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ revisionNumber: 3 }),
        );
        requirementRevisionsRepository.findOne.mockResolvedValue(null);

        await expect(
          service.findRequirement(PROJECT_ID, REQUIREMENT_ID, {
            revision: 2,
            allrevisions: false,
          }),
        ).rejects.toBeInstanceOf(NotFoundException);
      });
    });

    describe("updateRequirement", () => {
      it("creates a revision and resets a changed approved requirement to draft.", async () => {
        const existingRequirement = createRequirementEntity({
          status: RequirementStatus.Approved,
          revisionNumber: 2,
          reviewer: "Jane Reviewer",
          approvedAt: new Date("2026-06-28T11:00:00.000Z"),
        });
        const revision = new RequirementRevision();
        const savedRequirement = createRequirementEntity({
          description: "Users must sign in with MFA.",
          revisionNumber: 3,
          status: RequirementStatus.Draft,
          reviewer: null,
          approvedAt: null,
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(existingRequirement);
        requirementRevisionsRepository.create.mockReturnValue(revision);
        requirementRevisionsRepository.save.mockResolvedValue(revision);
        requirementsRepository.save.mockResolvedValue(savedRequirement);

        const result = await service.updateRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
          createUpdateRequirementDto(),
        );

        expect(requirementRevisionsRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            requirementId: REQUIREMENT_ID,
            revisionNumber: 2,
            status: RequirementStatus.Approved,
          }),
        );
        expect(requirementRevisionsRepository.save).toHaveBeenCalledWith(
          revision,
        );
        expect(existingRequirement.revisionNumber).toBe(3);
        expect(existingRequirement.status).toBe(RequirementStatus.Draft);
        expect(existingRequirement.description).toBe(
          "Users must sign in with MFA.",
        );
        expect(existingRequirement.reviewer).toBeNull();
        expect(existingRequirement.approvedAt).toBeNull();
        expect(result.revisionNumber).toBe(3);
        expect(result.status).toBe(RequirementStatus.Draft);
      });

      it("approves a draft requirement when a reviewer is provided.", async () => {
        const existingRequirement = createRequirementEntity();
        const revision = new RequirementRevision();
        const savedRequirement = createRequirementEntity({
          revisionNumber: 2,
          status: RequirementStatus.Approved,
          reviewer: "Jane Reviewer",
          approvedAt: new Date("2026-06-28T11:00:00.000Z"),
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(existingRequirement);
        requirementRevisionsRepository.create.mockReturnValue(revision);
        requirementRevisionsRepository.save.mockResolvedValue(revision);
        requirementsRepository.save.mockResolvedValue(savedRequirement);

        const result = await service.updateRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
          {
            status: RequirementStatus.Approved,
            reviewer: "Jane Reviewer",
          },
        );

        expect(existingRequirement.status).toBe(RequirementStatus.Approved);
        expect(existingRequirement.reviewer).toBe("Jane Reviewer");
        expect(existingRequirement.approvedAt).toBeInstanceOf(Date);
        expect(result.status).toBe(RequirementStatus.Approved);
      });

      it("rejects an invalid status transition from rejected to approved.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ status: RequirementStatus.Rejected }),
        );
        requirementRevisionsRepository.create.mockReturnValue(
          new RequirementRevision(),
        );
        requirementRevisionsRepository.save.mockResolvedValue(
          new RequirementRevision(),
        );

        await expect(
          service.updateRequirement(PROJECT_ID, REQUIREMENT_ID, {
            status: RequirementStatus.Approved,
            reviewer: "Jane Reviewer",
          }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementsRepository.save).not.toHaveBeenCalled();
      });

      it("requires an implementation ticket before an approved requirement can be implemented.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ status: RequirementStatus.Approved }),
        );

        await expect(
          service.updateRequirement(PROJECT_ID, REQUIREMENT_ID, {
            status: RequirementStatus.Implemented,
          }),
        ).rejects.toThrow("At least one implementation ticket is required");

        expect(requirementRevisionsRepository.save).not.toHaveBeenCalled();
        expect(requirementsRepository.save).not.toHaveBeenCalled();
      });

      it("rejects changes to implemented requirements.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ status: RequirementStatus.Implemented }),
        );
        requirementRevisionsRepository.create.mockReturnValue(
          new RequirementRevision(),
        );
        requirementRevisionsRepository.save.mockResolvedValue(
          new RequirementRevision(),
        );

        await expect(
          service.updateRequirement(
            PROJECT_ID,
            REQUIREMENT_ID,
            createUpdateRequirementDto(),
          ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementsRepository.save).not.toHaveBeenCalled();
      });

      it("rejects changes to requirements in the recycle bin.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ deletedAt: new Date() }),
        );

        await expect(
          service.updateRequirement(
            PROJECT_ID,
            REQUIREMENT_ID,
            createUpdateRequirementDto(),
          ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementRevisionsRepository.save).not.toHaveBeenCalled();
        expect(requirementsRepository.save).not.toHaveBeenCalled();
      });

      it("moves a changed requirement to another project category and allocates a new visible key.", async () => {
        const newCategoryId = "4a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d12";
        const existingRequirement = createRequirementEntity({
          status: RequirementStatus.Rejected,
          revisionNumber: 2,
        });
        const newCategory = createCategoryEntity({
          id: newCategoryId,
          key: "PERF",
          type: CategoryType.NFR,
        });
        const latestRequirementInNewCategory = createRequirementEntity({
          id: "5a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d13",
          categoryId: newCategoryId,
          sequenceNumber: 2,
          visibleKey: "NFR-PERF-0002",
        });
        const revision = new RequirementRevision();
        const savedRequirement = createRequirementEntity({
          categoryId: newCategoryId,
          sequenceNumber: 3,
          visibleKey: "NFR-PERF-0003",
          revisionNumber: 3,
          status: RequirementStatus.Draft,
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne
          .mockResolvedValueOnce(existingRequirement)
          .mockResolvedValueOnce(latestRequirementInNewCategory);
        categoriesRepository.findOne.mockResolvedValue(newCategory);
        requirementRevisionsRepository.create.mockReturnValue(revision);
        requirementRevisionsRepository.save.mockResolvedValue(revision);
        requirementsRepository.save.mockResolvedValue(savedRequirement);

        const result = await service.updateRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
          createUpdateRequirementDto({ categoryId: newCategoryId }),
        );

        expect(categoriesRepository.findOne).toHaveBeenCalledWith({
          where: { id: newCategoryId, projectId: PROJECT_ID },
        });
        expect(existingRequirement.categoryId).toBe(newCategoryId);
        expect(existingRequirement.sequenceNumber).toBe(3);
        expect(existingRequirement.visibleKey).toBe("NFR-PERF-0003");
        expect(result.visibleKey).toBe("NFR-PERF-0003");
      });

      it("rejects a draft requirement when reviewer and rejection reason are provided.", async () => {
        const existingRequirement = createRequirementEntity();
        const revision = new RequirementRevision();
        const savedRequirement = createRequirementEntity({
          revisionNumber: 2,
          status: RequirementStatus.Rejected,
          reviewer: "Jane Reviewer",
          rejectionReason: "The draft is not specific enough.",
          rejectedAt: new Date("2026-06-28T11:00:00.000Z"),
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(existingRequirement);
        requirementRevisionsRepository.create.mockReturnValue(revision);
        requirementRevisionsRepository.save.mockResolvedValue(revision);
        requirementsRepository.save.mockResolvedValue(savedRequirement);

        const result = await service.updateRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
          {
            status: RequirementStatus.Rejected,
            reviewer: "Jane Reviewer",
            rejectionReason: "The draft is not specific enough.",
          },
        );

        expect(existingRequirement.status).toBe(RequirementStatus.Rejected);
        expect(existingRequirement.reviewer).toBe("Jane Reviewer");
        expect(existingRequirement.rejectionReason).toBe(
          "The draft is not specific enough.",
        );
        expect(existingRequirement.rejectedAt).toBeInstanceOf(Date);
        expect(result.status).toBe(RequirementStatus.Rejected);
      });

      it("sets an approved requirement obsolete with actor and reason without replacing the reviewer.", async () => {
        const existingRequirement = createRequirementEntity({
          status: RequirementStatus.Approved,
          reviewer: "Jane Reviewer",
        });
        const revision = new RequirementRevision();
        const savedRequirement = createRequirementEntity({
          revisionNumber: 2,
          status: RequirementStatus.Obsolete,
          reviewer: "Jane Reviewer",
          obsoletedBy: "Olivia Owner",
          obsolescenceReason: "Replaced by a platform requirement.",
          obsoleteAt: new Date("2026-06-28T11:00:00.000Z"),
        });

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(existingRequirement);
        requirementRevisionsRepository.create.mockReturnValue(revision);
        requirementRevisionsRepository.save.mockResolvedValue(revision);
        requirementsRepository.save.mockResolvedValue(savedRequirement);

        const result = await service.updateRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
          {
            status: RequirementStatus.Obsolete,
            obsoletedBy: "Olivia Owner",
            obsolescenceReason: "Replaced by a platform requirement.",
          },
        );

        expect(existingRequirement.status).toBe(RequirementStatus.Obsolete);
        expect(existingRequirement.reviewer).toBe("Jane Reviewer");
        expect(existingRequirement.obsoletedBy).toBe("Olivia Owner");
        expect(existingRequirement.obsolescenceReason).toBe(
          "Replaced by a platform requirement.",
        );
        expect(existingRequirement.obsoleteAt).toBeInstanceOf(Date);
        expect(result.status).toBe(RequirementStatus.Obsolete);
      });

      it("requires a reviewer when approving a draft requirement.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity(),
        );

        await expect(
          service.updateRequirement(PROJECT_ID, REQUIREMENT_ID, {
            status: RequirementStatus.Approved,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementRevisionsRepository.save).not.toHaveBeenCalled();
        expect(requirementsRepository.save).not.toHaveBeenCalled();
      });

      it("requires an obsolescence reason when setting a requirement obsolete.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ status: RequirementStatus.Approved }),
        );

        await expect(
          service.updateRequirement(PROJECT_ID, REQUIREMENT_ID, {
            status: RequirementStatus.Obsolete,
            obsoletedBy: "Olivia Owner",
          }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementRevisionsRepository.save).not.toHaveBeenCalled();
        expect(requirementsRepository.save).not.toHaveBeenCalled();
      });

      it("requires a user name when setting a requirement obsolete.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ status: RequirementStatus.Approved }),
        );

        await expect(
          service.updateRequirement(PROJECT_ID, REQUIREMENT_ID, {
            status: RequirementStatus.Obsolete,
            obsolescenceReason: "Replaced by a platform requirement.",
          }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementRevisionsRepository.save).not.toHaveBeenCalled();
      });

      it("allows implemented requirements to become obsolete.", async () => {
        const existingRequirement = createRequirementEntity({
          status: RequirementStatus.Implemented,
          reviewer: "Jane Reviewer",
        });
        const revision = new RequirementRevision();

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(existingRequirement);
        requirementRevisionsRepository.create.mockReturnValue(revision);
        requirementRevisionsRepository.save.mockResolvedValue(revision);
        requirementsRepository.save.mockResolvedValue(existingRequirement);

        const result = await service.updateRequirement(
          PROJECT_ID,
          REQUIREMENT_ID,
          {
            status: RequirementStatus.Obsolete,
            obsoletedBy: "Olivia Owner",
            obsolescenceReason: "The implementation was retired.",
          },
        );

        expect(result.status).toBe(RequirementStatus.Obsolete);
        expect(result.reviewer).toBe("Jane Reviewer");
        expect(result.obsoletedBy).toBe("Olivia Owner");
        expect(result.obsoleteAt).toBeInstanceOf(Date);
      });

      it("does not allow rejected requirements to become obsolete.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ status: RequirementStatus.Rejected }),
        );

        await expect(
          service.updateRequirement(PROJECT_ID, REQUIREMENT_ID, {
            status: RequirementStatus.Obsolete,
            obsoletedBy: "Olivia Owner",
            obsolescenceReason: "No longer needed.",
          }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementRevisionsRepository.save).not.toHaveBeenCalled();
      });
    });

    describe("deleteRequirement", () => {
      it("soft deletes a draft requirement.", async () => {
        const existingRequirement = createRequirementEntity();

        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(existingRequirement);
        requirementsRepository.save.mockResolvedValue(
          createRequirementEntity({ deletedAt: new Date() }),
        );

        await service.deleteRequirement(PROJECT_ID, REQUIREMENT_ID, false);

        expect(existingRequirement.deletedAt).toBeInstanceOf(Date);
        expect(requirementsRepository.save).toHaveBeenCalledWith(
          existingRequirement,
        );
      });

      it("does not soft delete an approved requirement.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ status: RequirementStatus.Approved }),
        );

        await expect(
          service.deleteRequirement(PROJECT_ID, REQUIREMENT_ID, false),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementsRepository.save).not.toHaveBeenCalled();
      });

      it("permanently deletes a requirement from the recycle bin.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ deletedAt: new Date() }),
        );
        requirementsRepository.delete.mockResolvedValue({ affected: 1 });

        await service.deleteRequirement(PROJECT_ID, REQUIREMENT_ID, true);

        expect(requirementsRepository.delete).toHaveBeenCalledWith({
          id: REQUIREMENT_ID,
          projectId: PROJECT_ID,
        });
      });

      it("rejects permanent deletion when the requirement is not in the recycle bin.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity(),
        );

        await expect(
          service.deleteRequirement(PROJECT_ID, REQUIREMENT_ID, true),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(requirementsRepository.delete).not.toHaveBeenCalled();
      });

      it("does not save a draft requirement that is already in the recycle bin.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.findOne.mockResolvedValue(
          createRequirementEntity({ deletedAt: new Date() }),
        );

        await service.deleteRequirement(PROJECT_ID, REQUIREMENT_ID, false);

        expect(requirementsRepository.save).not.toHaveBeenCalled();
      });
    });

    describe("clearDeletedRequirements", () => {
      it("clears the recycle bin.", async () => {
        projectsRepository.findOne.mockResolvedValue(createProjectEntity());
        requirementsRepository.delete.mockResolvedValue({ affected: 2 });

        await service.clearDeletedRequirements(PROJECT_ID, true);

        expect(requirementsRepository.delete).toHaveBeenCalledWith({
          projectId: PROJECT_ID,
          deletedAt: expect.any(Object),
        });
      });

      it("requires the deleted query flag before clearing the recycle bin.", async () => {
        await expect(
          service.clearDeletedRequirements(PROJECT_ID, false),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(projectsRepository.findOne).not.toHaveBeenCalled();
        expect(requirementsRepository.delete).not.toHaveBeenCalled();
      });
    });
  });
});
