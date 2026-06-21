import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';

export interface DemoFixtureCategory {
    key: string;
    name: string;
    type: RequirementType;
}
export interface DemoFixtureProject {
    legacyId: string;
    name: string;
    requirementCount: number;
}
export interface DemoFixtureRequirement {
    legacyId: string;
    legacyProjectId: string;
    frontendVisibleKey: string;
    categoryKey: string;
    description: string;
    priority: string;
    status: RequirementStatus;
    owner: string | null;
    rationale: string | null;
    source: string | null;
}

export const DEMO_FIXTURE_RESET_ENV = 'REQUIREMENTS_ALLOW_DEMO_RESET';
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
];

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
            out.push({
                legacyId: `${project.legacyId}-req-${i + 1}`,
                legacyProjectId: project.legacyId,
                frontendVisibleKey: `${prefix}-${category.key}-${String(n).padStart(4, '0')}`,
                categoryKey: category.key,
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
export const DEMO_FIXTURE_METRICS = [
    { key: 'MET-0001', value: '2000 ms', description: 'Maximum demo response latency.' },
] as const;
