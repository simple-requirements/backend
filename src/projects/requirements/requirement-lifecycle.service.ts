import { BadRequestException, Injectable } from "@nestjs/common";

import type { UpdateRequirementDto } from "@/projects/dto/update-requirement.dto";
import { RequirementStatus } from "@/projects/requirement-status.enum";
import { Requirement } from "@/projects/requirements.entity";

@Injectable()
export class RequirementLifecycleService {
  validateStatusChange(
    requirement: Requirement,
    update: UpdateRequirementDto,
  ): void {
    switch (update.status) {
      case RequirementStatus.Approved:
        this.requireDraft(requirement, "approved");
        this.requireReviewer(update.reviewer, "approving");
        return;
      case RequirementStatus.Rejected:
        this.requireDraft(requirement, "rejected");
        this.requireReviewer(update.reviewer, "rejecting");
        if (
          update.rejectionReason === undefined ||
          update.rejectionReason === null
        )
          throw new BadRequestException(
            "Rejection reason must be provided when rejecting a requirement.",
          );
        return;
      case RequirementStatus.Implemented:
        if (requirement.status !== RequirementStatus.Approved)
          throw new BadRequestException(
            `Requirement in status "${requirement.status}" cannot be implemented.`,
          );
        if (requirement.implementationTickets.length === 0)
          throw new BadRequestException(
            "At least one implementation ticket is required before implementing a requirement.",
          );
        return;
      case RequirementStatus.Obsolete:
        this.getObsolescenceMetadata(requirement, update);
        return;
      default:
        throw new BadRequestException(
          "Requirement status cannot be changed to draft directly.",
        );
    }
  }

  applyStatusChange(
    requirement: Requirement,
    update: UpdateRequirementDto,
  ): void {
    switch (update.status) {
      case RequirementStatus.Approved:
        requirement.status = RequirementStatus.Approved;
        requirement.reviewer = update.reviewer ?? null;
        requirement.rejectionReason = null;
        requirement.rejectedAt = null;
        requirement.approvedAt = new Date();
        requirement.implementedAt = null;
        requirement.obsolescenceReason = null;
        requirement.obsoletedBy = null;
        requirement.obsoleteAt = null;
        return;
      case RequirementStatus.Rejected:
        requirement.status = RequirementStatus.Rejected;
        requirement.reviewer = update.reviewer ?? null;
        requirement.rejectionReason = update.rejectionReason ?? null;
        requirement.rejectedAt = new Date();
        requirement.approvedAt = null;
        requirement.implementedAt = null;
        requirement.obsolescenceReason = null;
        requirement.obsoletedBy = null;
        requirement.obsoleteAt = null;
        return;
      case RequirementStatus.Implemented:
        requirement.status = RequirementStatus.Implemented;
        requirement.implementedAt = new Date();
        return;
      case RequirementStatus.Obsolete: {
        const [obsoletedBy, reason] = this.getObsolescenceMetadata(
          requirement,
          update,
        );
        requirement.status = RequirementStatus.Obsolete;
        requirement.obsoletedBy = obsoletedBy;
        requirement.obsolescenceReason = reason;
        requirement.obsoleteAt = new Date();
        return;
      }
      default:
        throw new BadRequestException(
          "Requirement status cannot be changed to draft directly.",
        );
    }
  }

  private requireDraft(requirement: Requirement, action: string): void {
    if (requirement.status !== RequirementStatus.Draft)
      throw new BadRequestException(
        `Requirement in status "${requirement.status}" cannot be ${action}.`,
      );
  }

  private requireReviewer(
    reviewer: string | null | undefined,
    action: string,
  ): void {
    if (reviewer === undefined || reviewer === null)
      throw new BadRequestException(
        `Reviewer must be provided when ${action} a requirement.`,
      );
  }

  private getObsolescenceMetadata(
    requirement: Requirement,
    update: UpdateRequirementDto,
  ): readonly [string, string] {
    if (
      requirement.status !== RequirementStatus.Approved &&
      requirement.status !== RequirementStatus.Implemented
    )
      throw new BadRequestException(
        `Requirement in status "${requirement.status}" cannot be set obsolete.`,
      );
    if (update.obsoletedBy === undefined || update.obsoletedBy === null)
      throw new BadRequestException(
        "User name must be provided when setting a requirement obsolete.",
      );
    if (
      update.obsolescenceReason === undefined ||
      update.obsolescenceReason === null
    )
      throw new BadRequestException(
        "Obsolescence reason must be provided when setting a requirement obsolete.",
      );
    return [update.obsoletedBy, update.obsolescenceReason];
  }
}
