/**
 * Implemented lifecycle states for requirements.
 *
 * Deleted requirements are soft-deleted and hidden from normal reads, while
 * rejected requirements remain explicitly retrievable and can be included in
 * list responses.
 */
export enum RequirementStatus {
    Draft = 'draft',
    Rejected = 'rejected',
    Deleted = 'deleted',
}
