export type ExportScope = 'all_projects' | 'project' | 'requirements';
export type ExportFormatClass = 'data' | 'document';

export interface ExportWarning {
    code: string;
    message: string;
    projectId?: string;
    requirementId?: string;
    requirementKey?: string;
    metricKey?: string;
    revisionNumber?: number;
}

export interface ExportMetricSnapshot {
    metricId: string;
    key: string;
    value: string;
}

export interface ExportImplementationTicket {
    id: string;
    ticketId: string;
    completedBy: string;
    completedAt: string;
}

export interface ExportRequirementRevision {
    revisionNumber: number;
    categoryId: string;
    visibleKey: string;
    status: string;
    description: string | null;
    renderedDescription: string | null;
    metricSnapshots: ExportMetricSnapshot[];
    priority: string | null;
    owner: string | null;
    rationale: string | null;
    source: string | null;
    reviewer: string | null;
    rejectionReason: string | null;
    obsoletedBy: string | null;
    obsolescenceReason: string | null;
    implementationTickets: ExportImplementationTicket[];
    changeType: string;
    changeReason: string;
    changedAt: string;
    changedByUserId: string | null;
    changedByDisplayName: string;
    createdAt: string;
    updatedAt: string;
}

export interface ExportRequirement {
    id: string;
    categoryId: string;
    sequenceNumber: number;
    visibleKey: string;
    revisionNumber: number;
    status: string;
    description: string | null;
    renderedDescription: string | null;
    priority: string | null;
    owner: string | null;
    rationale: string | null;
    source: string | null;
    reviewer: string | null;
    rejectionReason: string | null;
    obsoletedBy: string | null;
    obsolescenceReason: string | null;
    implementationTickets: ExportImplementationTicket[];
    changeType: string;
    changeReason: string;
    changedAt: string;
    changedByUserId: string | null;
    changedByDisplayName: string;
    createdAt: string;
    updatedAt: string;
    revisions: ExportRequirementRevision[];
}

export interface ExportCategory {
    id: string;
    key: string;
    name: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

export interface ExportMetric {
    id: string;
    key: string;
    value: string;
    description: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ExportRequirementMetricLink {
    requirementId: string;
    requirementKey: string;
    metricId: string;
    metricKey: string;
}

export interface ExportRequirementLink {
    id: string;
    relationshipType: 'references';
    sourceRequirementId: string;
    sourceRequirementKey: string;
    targetRequirementId: string;
    targetRequirementKey: string;
    createdAt: string;
    updatedAt: string;
}

export interface ExportProjectBundle {
    project: { id: string; name: string; ticketUrlTemplate: string | null; createdAt: string; updatedAt: string };
    categories: ExportCategory[];
    metrics: ExportMetric[];
    requirements: ExportRequirement[];
    requirementMetricLinks: ExportRequirementMetricLink[];
    requirementLinks: ExportRequirementLink[];
    requirementLinkHistory: never[];
}

export interface CanonicalExportBundle {
    schemaVersion: '1.0';
    application: 'Requirements Management';
    exportedAt: string;
    formatId: string;
    scope: ExportScope;
    warnings: ExportWarning[];
    projects: ExportProjectBundle[];
}

export interface ExportFormatCapabilities {
    allProjects: boolean;
    project: boolean;
    requirementSelection: boolean;
    importRoundTripReady: boolean;
    renderedMetrics: boolean;
    originalMetricPlaceholders: boolean;
    revisionHistory: boolean;
    linkHistory: boolean;
}

export interface ExportFormatDescriptor {
    id: string;
    label: string;
    fileExtension: string;
    mediaType: string;
    formatClass: ExportFormatClass;
    capabilities: ExportFormatCapabilities;
}

export interface ExportFormatAdapter extends ExportFormatDescriptor {
    render(bundle: CanonicalExportBundle): string;
}

export interface RenderedExport {
    content: string;
    mediaType: string;
    filename: string;
}
