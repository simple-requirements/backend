import type { CanonicalExportBundle, ExportFormatAdapter, ExportProjectBundle, ExportRequirement } from '@/export/export.types';
import { displayValue, metricLinks, outgoingLinks, requirementCategory, revisionCategory } from '@/export/adapters/document-export.helpers';

function linesForRequirement(project: ExportProjectBundle, requirement: ExportRequirement): string[] {
    const category = requirementCategory(project, requirement);
    const lines = [
        `[[${requirement.visibleKey.toLowerCase()}]]`,
        `=== ${requirement.visibleKey}`,
        '',
        `*Category:* ${category === undefined ? requirement.categoryId : `${category.type} / ${category.name} (${category.key})`}`,
        `*Status:* ${requirement.status}`,
        `*Priority:* ${displayValue(requirement.priority)}`,
        `*Owner:* ${displayValue(requirement.owner)}`,
        `*Source:* ${displayValue(requirement.source)}`,
        `*Rationale:* ${displayValue(requirement.rationale)}`,
        `*Revision:* ${String(requirement.revisionNumber)}`,
        '',
        '==== Description',
        '',
        displayValue(requirement.renderedDescription),
    ];
    if (requirement.description !== requirement.renderedDescription) {
        lines.push('', '==== Original description', '', displayValue(requirement.description));
    }
    const metrics = metricLinks(project, requirement.id);
    lines.push('', '==== Metrics', '', metrics.length === 0 ? 'None.' : metrics.map((link) => `* ${link.metricKey}`).join('\n'));
    const links = outgoingLinks(project, requirement.id);
    lines.push('', '==== References', '', links.length === 0 ? 'None.' : links.map((link) => `* ${link.targetRequirementKey}`).join('\n'));
    lines.push('', '==== Revision history', '');
    for (const revision of requirement.revisions) {
        const revisionCategoryValue = revisionCategory(project, revision);
        lines.push(
            `===== Revision ${String(revision.revisionNumber)} — ${revision.changeType}`,
            '',
            `*Changed:* ${revision.changedAt} by ${revision.changedByDisplayName}`,
            `*Reason:* ${revision.changeReason}`,
            `*Category:* ${revisionCategoryValue?.key ?? revision.categoryId}`,
            `*Status:* ${revision.status}`,
            '',
            displayValue(revision.renderedDescription),
            '',
        );
    }
    return lines;
}

export class AsciiDocExportAdapter implements ExportFormatAdapter {
    readonly id = 'asciidoc';
    readonly label = 'AsciiDoc';
    readonly fileExtension = 'adoc';
    readonly mediaType = 'text/asciidoc; charset=utf-8';
    readonly formatClass = 'document' as const;
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
        const lines = ['= Requirements export', '', `Exported: ${bundle.exportedAt}`, ''];
        for (const project of bundle.projects) {
            lines.push(`== ${project.project.name}`, '');
            for (const requirement of project.requirements) lines.push(...linesForRequirement(project, requirement));
        }
        if (bundle.warnings.length > 0) {
            lines.push('== Export warnings', '', ...bundle.warnings.map((warning) => `* ${warning.message}`), '');
        }
        return lines.join('\n').trimEnd() + '\n';
    }
}
