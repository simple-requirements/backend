import { describe, expect, it } from 'vitest';

import { exportFormatQuerySchema, requirementSelectionExportQuerySchema } from '@/export/export.schemas';

describe('export query schemas', () => {
    it('defaults the format to json and deduplicates later in the builder.', () => {
        expect(exportFormatQuerySchema.parse({})).toEqual({ format: 'json' });
        expect(requirementSelectionExportQuerySchema.parse({ id: '11111111-1111-4111-8111-111111111111' })).toEqual({
            id: ['11111111-1111-4111-8111-111111111111'],
            format: 'json',
        });
    });

    it('rejects invalid requirement selectors.', () => {
        expect(requirementSelectionExportQuerySchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
        expect(requirementSelectionExportQuerySchema.safeParse({ id: '' }).success).toBe(false);
    });
});
