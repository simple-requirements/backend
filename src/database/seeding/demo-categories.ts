import { CategoryType } from '@/projects/category-type.enum';

export type DemoCategory = Readonly<{ id: string; projectId: string; name: string; key: string; type: CategoryType }>;

export const demoCategories: readonly DemoCategory[] = [
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2001',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'Authentication',
        key: 'AUTH',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2002',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'Authorization',
        key: 'ATZ',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2003',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'Audit Trail',
        key: 'AUD',
        type: CategoryType.NFR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2004',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'User Management',
        key: 'USER',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2005',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        name: 'Security',
        key: 'SEC',
        type: CategoryType.NFR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2006',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1002',
        name: 'Authentication',
        key: 'LOGN',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2007',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1002',
        name: 'Navigation',
        key: 'NAV',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2008',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1002',
        name: 'Accessibility',
        key: 'ACC',
        type: CategoryType.NFR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2009',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        name: 'Import',
        key: 'IMP',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2010',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        name: 'Export',
        key: 'EXP',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2011',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        name: 'Traceability',
        key: 'TRC',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2012',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        name: 'Validation',
        key: 'VAL',
        type: CategoryType.NFR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2013',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1004',
        name: 'Dashboard',
        key: 'DASH',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2014',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1004',
        name: 'Reporting',
        key: 'RPT',
        type: CategoryType.FR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2015',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1005',
        name: 'Planning',
        key: 'PLAN',
        type: CategoryType.FR,
    },

    // Project 1006, "Nova Documentation", intentionally has no categories.

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2016',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1007',
        name: 'Traceability',
        key: 'LINK',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2017',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1007',
        name: 'Audit Trail',
        key: 'HIST',
        type: CategoryType.NFR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2018',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1007',
        name: 'Coverage',
        key: 'COV',
        type: CategoryType.NFR,
    },

    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2019',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1008',
        name: 'Backlog',
        key: 'BL',
        type: CategoryType.FR,
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2020',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1008',
        name: 'Prioritization',
        key: 'PRIO',
        type: CategoryType.FR,
    },
];
