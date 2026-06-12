/**
 * Implemented lifecycle states for requirements.
 *
 * Implemented, obsolete, and deleted are terminal states. Deleted requirements
 * are soft-deleted and hidden from normal reads, while status filters can
 * explicitly retrieve other non-deleted lifecycle states.
 */
export enum RequirementStatus {
    Draft = 'draft',
    Approved = 'approved',
    Implemented = 'implemented',
    Obsolete = 'obsolete',
    Rejected = 'rejected',
    Deleted = 'deleted',
}
