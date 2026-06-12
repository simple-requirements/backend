import { RequirementKind } from '@/requirements/requirement-kind.enum';

export interface AllocatedRequirementKeyDto {
    id: string;
    kind: RequirementKind;
    categoryId: string;
    sequenceNumber: number;
    visibleKey: string;
}
