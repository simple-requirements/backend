import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';

export interface RequirementResponseDto {
    id: string;
    visibleKey: string;
    type: RequirementType;
    categoryId: string;
    sequenceNumber: number;
    status: RequirementStatus;
    description: string;
    priority: string;
    owner: string | null;
    rationale: string | null;
    source: string | null;
    rejectionReason: string | null;
    reviewer: string | null;
    rejectedAt: string | null;
    deletedAt: string | null;
    approvedAt: string | null;
    implementedAt: string | null;
    obsolescenceReason: string | null;
    obsoleteAt: string | null;
    createdAt: string;
    updatedAt: string;
}
