import type { ExportProjectBundle, ExportRequirement, ExportRequirementRevision } from '@/export/export.types';

export function displayValue(value: string | null): string {
    return value === null || value.length === 0 ? '—' : value;
}

export function requirementCategory(project: ExportProjectBundle, requirement: ExportRequirement) {
    return project.categories.find((category) => category.id === requirement.categoryId);
}

export function revisionCategory(project: ExportProjectBundle, revision: ExportRequirementRevision) {
    return project.categories.find((category) => category.id === revision.categoryId);
}

export function outgoingLinks(project: ExportProjectBundle, requirementId: string) {
    return project.requirementLinks.filter((link) => link.sourceRequirementId === requirementId);
}

export function metricLinks(project: ExportProjectBundle, requirementId: string) {
    return project.requirementMetricLinks.filter((link) => link.requirementId === requirementId);
}
