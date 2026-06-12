export interface UpdateRequirementDto {
    description?: string;
    priority?: string;
    owner?: string | null;
    rationale?: string | null;
    source?: string | null;
}
