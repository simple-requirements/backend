import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ProjectMembershipService } from "@/auth/authorization/project-membership.service";
import { Category } from "@/projects/categories.entity";
import type { AdministratorProjectSummaryResponseDto } from "@/projects/dto/administrator-project-summary-response.dto";
import type { CreateProjectDto } from "@/projects/dto/create-project.dto";
import type { ProjectResponseDto } from "@/projects/dto/project-response.dto";
import type { UpdateProjectDto } from "@/projects/dto/update-project.dto";
import { ProjectsService } from "@/projects/projects.service";
import { Requirement } from "@/projects/requirements.entity";

@Injectable()
export class AdministratorProjectsService {
  constructor(
    private readonly projects: ProjectsService,
    private readonly memberships: ProjectMembershipService,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Requirement)
    private readonly requirements: Repository<Requirement>,
  ) {}

  async list(): Promise<AdministratorProjectSummaryResponseDto[]> {
    const projects = await this.projects.findAll();
    return Promise.all(projects.map((project) => this.toSummary(project)));
  }

  async find(
    projectId: string,
  ): Promise<AdministratorProjectSummaryResponseDto> {
    return this.toSummary(await this.projects.findOne(projectId));
  }

  async create(
    createProjectDto: CreateProjectDto,
  ): Promise<AdministratorProjectSummaryResponseDto> {
    return this.toSummary(await this.projects.create(createProjectDto));
  }

  async update(
    projectId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<AdministratorProjectSummaryResponseDto> {
    return this.toSummary(
      await this.projects.update(projectId, updateProjectDto),
    );
  }

  delete(projectId: string): Promise<void> {
    return this.projects.delete(projectId);
  }

  private async toSummary(
    project: ProjectResponseDto,
  ): Promise<AdministratorProjectSummaryResponseDto> {
    const [categories, requirementCount, memberships] = await Promise.all([
      this.categories.find({
        where: { projectId: project.id },
        select: { name: true },
        order: { name: "ASC" },
      }),
      this.requirements.countBy({ projectId: project.id }),
      this.memberships.list(project.id),
    ]);

    return {
      id: project.id,
      name: project.name,
      categoryNames: categories.map(({ name }) => name),
      categoryCount: categories.length,
      requirementCount,
      memberships,
      ticketUrlTemplate: project.ticketUrlTemplate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
