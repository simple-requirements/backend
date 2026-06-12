import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';

/**
 * Supported HTTP query filters for requirement listing.
 *
 * The DTO belongs to the HTTP boundary and intentionally mirrors only filters
 * already supported by the requirement service. Deleted requirements remain
 * hidden even when the deleted status is requested.
 */
export interface RequirementListQueryDto {
    includeRejected?: string;
    type?: RequirementType;
    kind?: RequirementType;
    categoryId?: string;
    status?: RequirementStatus;
    owner?: string;
}

/**
 * Validated service-level listing filters for persisted requirements.
 *
 * This type belongs to the application service layer after string query
 * parameters have been normalized and validated.
 */
export interface RequirementListFilters {
    includeRejected: boolean;
    type?: RequirementType;
    categoryId?: string;
    status?: RequirementStatus;
    owner?: string;
}
