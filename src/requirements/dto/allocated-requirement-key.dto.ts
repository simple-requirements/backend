import { RequirementType } from '@/requirements/requirement-type-enum';

export interface AllocatedRequirementKeyDto {
    id: string;
    type: RequirementType;
    categoryId: string;
    sequenceNumber: number;
    visibleKey: string;
}
