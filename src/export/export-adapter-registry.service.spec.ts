import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ExportAdapterRegistryService } from '@/export/export-adapter-registry.service';

const bundle = {
    schemaVersion: '1.0' as const,
    application: 'Requirements Management' as const,
    exportedAt: '2026-10-02T12:00:00.000Z',
    formatId: 'json',
    scope: 'project' as const,
    warnings: [],
    projects: [],
};

describe('ExportAdapterRegistryService', () => {
    const registry = new ExportAdapterRegistryService();

    it('discovers the first-release formats and capabilities.', () => {
        expect(registry.list().map(({ id }) => id)).toEqual(['json', 'markdown', 'asciidoc']);
        expect(registry.list()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'json',
                    formatClass: 'data',
                    capabilities: expect.objectContaining({ project: true, revisionHistory: true, linkHistory: false }),
                }),
            ]),
        );
    });

    it('renders canonical JSON and rejects unsupported formats.', () => {
        expect(registry.get('json').render(bundle)).toContain('"schemaVersion": "1.0"');
        expect(() => registry.get('yaml')).toThrow(BadRequestException);
    });
});
