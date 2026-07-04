/**
 * Lifecycle states supported by requirements.
 *
 * The enum values are persisted directly in the database and returned through the API.
 */
export enum RequirementStatus {
    Draft = 'draft',
    Approved = 'approved',
    Implemented = 'implemented',
    Obsolete = 'obsolete',
    Rejected = 'rejected',
}
