import { describe, expect, it } from 'vitest';

import { createRequirementLinkSchema, updateRequirementLinkSchema } from '@/projects/dto/requirement-link.schemas';

describe('requirement link schemas', () => {
    it('accepts project-visible requirement keys and trims surrounding whitespace.', () => {
        expect(createRequirementLinkSchema.parse({ targetKey: '  NFR-PERF-0005  ' })).toEqual({
            targetKey: 'NFR-PERF-0005',
        });
    });

    it('rejects unknown body fields and malformed target keys.', () => {
        expect(createRequirementLinkSchema.safeParse({ targetKey: 'MET-0001' }).success).toBe(false);
        expect(
            updateRequirementLinkSchema.safeParse({ targetKey: 'FR-AUTH-0001', relationshipType: 'depends_on' })
                .success,
        ).toBe(false);
    });
});
