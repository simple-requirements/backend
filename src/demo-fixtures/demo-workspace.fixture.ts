import { createHash } from 'node:crypto';

import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';

export interface DemoFixtureCategory {
    id: string;
    key: string;
    name: string;
    type: RequirementType;
}
export interface DemoFixtureProject {
    id: string;
    legacyId: string;
    name: string;
    requirementCount: number;
}
export interface DemoFixtureMetric {
    id: string;
    projectId: string;
    key: string;
    value: string;
    description: string | null;
}
export interface DemoFixtureRequirement {
    id: string;
    legacyId: string;
    projectId: string;
    legacyProjectId: string;
    visibleKey: string;
    categoryId: string;
    categoryKey: string;
    type: RequirementType;
    sequenceNumber: number;
    description: string;
    priority: string;
    status: RequirementStatus;
    owner: string | null;
    rationale: string | null;
    source: string | null;
}

export const DEMO_FIXTURE_RESET_ENV = 'REQUIREMENTS_ALLOW_DEMO_RESET';
export const DEMO_FIXTURE_TIMESTAMP = new Date('2024-01-01T00:00:00.000Z');

export function demoFixtureId(kind: string, key: string): string {
    const hex = createHash('sha256').update(`requirements-demo-fixture:${kind}:${key}`).digest('hex').slice(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const specs = [
    ['project-alpha', 'Requirements Platform', 18],
    ['project-beta', 'Customer Portal', 12],
    ['project-gamma', 'Reporting and Analytics', 27],
    ['project-delta', 'Mobile Application', 9],
    ['project-epsilon', 'Integration Platform', 34],
    ['project-zeta', 'Security Hardening', 14],
    ['project-eta', 'Billing Modernization', 21],
    ['project-theta', 'Archive Migration', 16],
] as const;

export const DEMO_FIXTURE_PROJECTS: readonly DemoFixtureProject[] = specs.map(([legacyId, name, requirementCount]) => ({
    id: demoFixtureId('project', legacyId),
    legacyId,
    name,
    requirementCount,
}));

export const DEMO_FIXTURE_CATEGORIES: readonly DemoFixtureCategory[] = [
    { key: 'AUTH', name: 'Authentication', type: RequirementType.FR },
    { key: 'DATA', name: 'Data Management', type: RequirementType.FR },
    { key: 'UI', name: 'User Interface', type: RequirementType.FR },
    { key: 'INT', name: 'Integration', type: RequirementType.FR },
    { key: 'PERF', name: 'Performance', type: RequirementType.NFR },
    { key: 'SEC', name: 'Security', type: RequirementType.NFR },
    { key: 'USAB', name: 'Usability', type: RequirementType.NFR },
].map((category) => ({ ...category, id: demoFixtureId('category', category.key) }));

const statuses = [
    RequirementStatus.Draft,
    RequirementStatus.Approved,
    RequirementStatus.Implemented,
    RequirementStatus.Rejected,
    RequirementStatus.Obsolete,
] as const;
const priorities = ['p1', 'p2', 'p3', 'p3'] as const;

export function generateDemoFixtureRequirements(): DemoFixtureRequirement[] {
    let n = 1;
    const out: DemoFixtureRequirement[] = [];
    for (const project of DEMO_FIXTURE_PROJECTS) {
        for (let i = 0; i < project.requirementCount; i += 1) {
            const category = DEMO_FIXTURE_CATEGORIES[(i + n) % DEMO_FIXTURE_CATEGORIES.length];
            const prefix = category.type === RequirementType.FR ? 'FR' : 'NFR';
            const visibleKey = `${prefix}-${category.key}-${String(n).padStart(4, '0')}`;
            const legacyId = `${project.legacyId}-req-${i + 1}`;
            out.push({
                id: demoFixtureId('requirement', legacyId),
                legacyId,
                projectId: project.id,
                legacyProjectId: project.legacyId,
                visibleKey,
                categoryId: category.id,
                categoryKey: category.key,
                type: category.type,
                sequenceNumber: n,
                description: `Demo ${category.name.toLowerCase()} requirement ${i + 1} for ${project.legacyId.replace('project-', 'project ')}.`,
                priority: priorities[(i + n) % priorities.length],
                status: statuses[(i + n) % statuses.length],
                owner: i % 3 === 0 ? null : `Demo Owner ${(i % 5) + 1}`,
                rationale: i % 4 === 0 ? null : 'Supports the local interactive prototype.',
                source: i % 5 === 0 ? null : 'Workshop note',
            });
            n += 1;
        }
    }
    return out;
}

export const DEMO_FIXTURE_REQUIREMENTS = generateDemoFixtureRequirements();

export const DEMO_FIXTURE_METRICS: readonly DemoFixtureMetric[] = DEMO_FIXTURE_PROJECTS.map((project) => ({
    id: demoFixtureId('metric', `${project.legacyId}:MET-0001`),
    projectId: project.id,
    key: 'MET-0001',
    value: '2000 ms',
    description: 'Maximum demo response latency.',
}));
