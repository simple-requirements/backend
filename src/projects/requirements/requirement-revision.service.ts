import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RequirementRevision } from "@/projects/requirement-revisions.entity";
import { Requirement } from "@/projects/requirements.entity";

@Injectable()
export class RequirementRevisionService {
  constructor(
    @InjectRepository(RequirementRevision)
    private readonly revisions: Repository<RequirementRevision>,
  ) {}

  async storeCurrent(requirement: Requirement): Promise<void> {
    const revision = this.revisions.create({
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
      implementationTickets: requirement.implementationTickets.map(
        ({ id, ticketId, completedBy, completedAt }) => ({
          id,
          ticketId,
          completedBy,
          completedAt,
        }),
      ),
      rejectedAt: requirement.rejectedAt,
      deletedAt: requirement.deletedAt,
      approvedAt: requirement.approvedAt,
      implementedAt: requirement.implementedAt,
      obsolescenceReason: requirement.obsolescenceReason,
      obsoleteAt: requirement.obsoleteAt,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
    });

    await this.revisions.save(revision);
  }

  findAll(
    projectId: string,
    requirementId: string,
  ): Promise<RequirementRevision[]> {
    return this.revisions.find({
      where: { requirementId, projectId },
      order: { revisionNumber: "ASC" },
    });
  }

  async findOne(
    projectId: string,
    requirementId: string,
    revisionNumber: number,
  ): Promise<RequirementRevision> {
    const revision = await this.revisions.findOne({
      where: { requirementId, projectId, revisionNumber },
    });

    if (revision === null) {
      throw new NotFoundException(
        `Revision ${revisionNumber.toString()} of requirement "${requirementId}" in project "${projectId}" was not found.`,
      );
    }

    return revision;
  }
}
