import type { CanonicalExportBundle, ExportFormatAdapter } from '@/export/export.types';

export class JsonExportAdapter implements ExportFormatAdapter {
    readonly id = 'json';
    readonly label = 'JSON';
    readonly fileExtension = 'json';
    readonly mediaType = 'application/json';
    readonly formatClass = 'data' as const;
    readonly capabilities = {
        allProjects: true,
        project: true,
        requirementSelection: true,
        importRoundTripReady: false,
        renderedMetrics: true,
        originalMetricPlaceholders: true,
        revisionHistory: true,
        linkHistory: false,
    } as const;

    render(bundle: CanonicalExportBundle): string {
        return JSON.stringify(bundle, null, 2) + '\n';
    }
}
