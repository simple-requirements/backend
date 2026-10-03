import { describe, expect, it } from 'vitest';

import { AsciiDocExportAdapter } from '@/export/adapters/asciidoc-export.adapter';
import { MarkdownExportAdapter } from '@/export/adapters/markdown-export.adapter';
import type { CanonicalExportBundle } from '@/export/export.types';

const bundle: CanonicalExportBundle = {
    schemaVersion: '1.0',
    application: 'Requirements Management',
    exportedAt: '2026-10-02T12:00:00.000Z',
    formatId: 'markdown',
    scope: 'project',
    warnings: [],
    projects: [
        {
            project: {
                id: 'project-id',
                name: 'Example Project',
                ticketUrlTemplate: null,
                createdAt: '2026-10-01T10:00:00.000Z',
                updatedAt: '2026-10-01T10:00:00.000Z',
            },
            categories: [
                {
                    id: 'category-id',
                    key: 'PERF',
                    name: 'Performance',
                    type: 'NFR',
                    createdAt: '2026-10-01T10:00:00.000Z',
                    updatedAt: '2026-10-01T10:00:00.000Z',
                },
            ],
            metrics: [],
            requirementMetricLinks: [
                {
                    requirementId: 'requirement-id',
                    requirementKey: 'NFR-PERF-0001',
                    metricId: 'metric-id',
                    metricKey: 'MET-0001',
                },
            ],
            requirementLinks: [
                {
                    id: 'link-id',
                    relationshipType: 'references',
                    sourceRequirementId: 'requirement-id',
                    sourceRequirementKey: 'NFR-PERF-0001',
                    targetRequirementId: 'target-id',
                    targetRequirementKey: 'FR-AUTH-0001',
                    createdAt: '2026-10-01T10:00:00.000Z',
                    updatedAt: '2026-10-01T10:00:00.000Z',
                },
            ],
            requirementLinkHistory: [],
            requirements: [
                {
                    id: 'requirement-id',
                    categoryId: 'category-id',
                    sequenceNumber: 1,
                    visibleKey: 'NFR-PERF-0001',
                    revisionNumber: 1,
                    status: 'draft',
                    description: 'Below [~MET-0001].',
                    renderedDescription: 'Below 2000 ms.',
                    priority: 'p1',
                    owner: 'Owner',
                    rationale: 'Why',
                    source: 'Workshop',
                    reviewer: null,
                    rejectionReason: null,
                    obsoletedBy: null,
                    obsolescenceReason: null,
                    implementationTickets: [],
                    changeType: 'requirement_created',
                    changeReason: 'Requirement created',
                    changedAt: '2026-10-01T10:00:00.000Z',
                    changedByUserId: null,
                    changedByDisplayName: 'System',
                    createdAt: '2026-10-01T10:00:00.000Z',
                    updatedAt: '2026-10-01T10:00:00.000Z',
                    revisions: [],
                },
            ],
        },
    ],
};

describe('document export adapters', () => {
    it.each([
        ['Markdown', new MarkdownExportAdapter()],
        ['AsciiDoc', new AsciiDocExportAdapter()],
    ])('renders readable metric values, original placeholders, and visible-key links in %s.', (_name, adapter) => {
        const output = adapter.render(bundle);
        expect(output).toContain('NFR-PERF-0001');
        expect(output).toContain('Below 2000 ms.');
        expect(output).toContain('Below [~MET-0001].');
        expect(output).toContain('MET-0001');
        expect(output).toContain('FR-AUTH-0001');
    });
});
