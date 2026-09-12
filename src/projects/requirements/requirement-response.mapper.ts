import { Injectable } from "@nestjs/common";

import type { ImplementationTicketResponseDto } from "@/projects/dto/implementation-ticket.dto";
import type { RequirementResponseDto } from "@/projects/dto/requirement-response.dto";
import { RequirementImplementationTicket } from "@/projects/requirement-implementation-ticket.entity";
import { RequirementRevision } from "@/projects/requirement-revisions.entity";
import { Requirement } from "@/projects/requirements.entity";

@Injectable()
export class RequirementResponseMapper {
  fromRevision(revision: RequirementRevision): RequirementResponseDto {
    return {
      id: revision.requirementId,
      projectId: revision.projectId,
      categoryId: revision.categoryId,
      sequenceNumber: revision.sequenceNumber,
      visibleKey: revision.visibleKey,
      revisionNumber: revision.revisionNumber,
      changeType: revision.changeType,
      changeReason: revision.changeReason,
      changedAt: revision.changedAt,
      changedByUserId: revision.changedByUserId,
      changedByDisplayName: revision.changedByDisplayName,
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

  fromRequirement(requirement: Requirement): RequirementResponseDto {
    const template =
      requirement.implementationTickets.length === 0
        ? null
        : requirement.project.ticketUrlTemplate;

    return {
      id: requirement.id,
      projectId: requirement.projectId,
      categoryId: requirement.categoryId,
      sequenceNumber: requirement.sequenceNumber,
      visibleKey: requirement.visibleKey,
      revisionNumber: requirement.revisionNumber,
      changeType: requirement.changeType,
      changeReason: requirement.changeReason,
      changedAt: requirement.changedAt,
      changedByUserId: requirement.changedByUserId,
      changedByDisplayName: requirement.changedByDisplayName,
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
        this.fromImplementationTicket(ticket, template),
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

  fromImplementationTicket(
    ticket: RequirementImplementationTicket,
    template: string | null,
  ): ImplementationTicketResponseDto {
    return {
      id: ticket.id,
      requirementId: ticket.requirementId,
      ticketId: ticket.ticketId,
      completedBy: ticket.completedBy,
      completedAt: ticket.completedAt,
      url:
        template === null
          ? null
          : template.replace(
              "{ticket-id}",
              encodeURIComponent(ticket.ticketId),
            ),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
