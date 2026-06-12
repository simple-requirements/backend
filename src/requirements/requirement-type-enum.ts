/**
 * Requirement types supported by visible-key allocation.
 *
 * The enum values are used directly as visible-key prefixes and are therefore
 * constrained by validation and database check constraints.
 */
export enum RequirementType {
    FR = 'FR',
    NFR = 'NFR',
}
