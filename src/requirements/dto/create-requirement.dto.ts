import { RequirementType } from '@/requirements/requirement-type-enum';

export interface CreateRequirementDto {
    kind: RequirementType;
    categoryId: string;
    title: string;
    description: string;
    priority: string;
    owner?: string | null;
    rationale?: string | null;
    source?: string | null;
}
