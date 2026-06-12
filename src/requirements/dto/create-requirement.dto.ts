import { RequirementType } from '@/requirements/requirement-type-enum';

export interface CreateRequirementDto {
    type: RequirementType;
    categoryId: string;
    description: string;
    priority: string;
    owner?: string | null;
    rationale?: string | null;
    source?: string | null;
}
