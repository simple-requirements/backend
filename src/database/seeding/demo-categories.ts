import { RequirementType } from '@/requirements/requirement-type.enum';

export type DemoCategory = Readonly<{
    id: string;
    projectId: string;
    name: string;
    key: string;
    type: RequirementType;
}>;

export const demoCategories: readonly DemoCategory[] = [
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2001',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'Authentication',
        key: 'AUTH',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2002',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'Authorization',
        key: 'ATZ',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2003',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'Audit Trail',
        key: 'AUD',
        type: RequirementType.NFR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2004',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'User Management',
        key: 'USER',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2005',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'Security',
        key: 'SEC',
        type: RequirementType.NFR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2006',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1002',
        name: 'Authentication',
        key: 'LOGN',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2007',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1002',
        name: 'Navigation',
        key: 'NAV',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2008',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1002',
        name: 'Accessibility',
        key: 'ACC',
        type: RequirementType.NFR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2009',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        name: 'Import',
        key: 'IMP',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2010',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        name: 'Export',
        key: 'EXP',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2011',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        name: 'Traceability',
        key: 'TRC',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2012',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        name: 'Validation',
        key: 'VAL',
        type: RequirementType.NFR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2013',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1004',
        name: 'Dashboard',
        key: 'DASH',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2014',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1004',
        name: 'Reporting',
        key: 'RPT',
        type: RequirementType.FR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2015',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1005',
        name: 'Planning',
        key: 'PLAN',
        type: RequirementType.FR,
    },

    // Project 1006, "Nova Documentation", intentionally has no categories.

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2016',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1007',
        name: 'Traceability',
        key: 'LINK',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2017',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1007',
        name: 'Audit Trail',
        key: 'HIST',
        type: RequirementType.NFR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2018',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1007',
        name: 'Coverage',
        key: 'COV',
        type: RequirementType.NFR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2019',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1008',
        name: 'Backlog',
        key: 'BL',
        type: RequirementType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2020',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1008',
        name: 'Prioritization',
        key: 'PRIO',
        type: RequirementType.FR,
    },
];
