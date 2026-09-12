import { RequirementStatus } from '@/projects/requirement-status.enum';
import type { Requirement } from '@/projects/requirements.entity';

type DemoRequirement = Pick<
    Requirement,
    | 'id'
    | 'projectId'
    | 'categoryId'
    | 'sequenceNumber'
    | 'visibleKey'
    | 'revisionNumber'
    | 'status'
    | 'description'
    | 'priority'
    | 'owner'
    | 'rationale'
    | 'source'
    | 'rejectionReason'
    | 'reviewer'
    | 'obsoletedBy'
    | 'rejectedAt'
    | 'approvedAt'
    | 'implementedAt'
    | 'obsolescenceReason'
    | 'obsoleteAt'
    | 'createdAt'
    | 'updatedAt'
>;

export const demoRequirements: readonly DemoRequirement[] = [
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e3001',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        categoryId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2001',
        sequenceNumber: 1,
        visibleKey: 'FR-AUTH-0001',
        revisionNumber: 3,
        status: RequirementStatus.Draft,
        description: 'Users must sign in with an email address and a second factor.',
        priority: 'p1',
        owner: 'Product Owner',
        rationale: 'Protect user accounts against credential theft.',
        source: 'Security workshop',
        rejectionReason: null,
        reviewer: null,
        obsoletedBy: null,
        rejectedAt: null,
        approvedAt: null,
        implementedAt: null,
        obsolescenceReason: null,
        obsoleteAt: null,
        createdAt: new Date('2026-06-20T08:00:00.000Z'),
        updatedAt: new Date('2026-06-22T10:30:00.000Z'),
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e3002',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        categoryId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2005',
        sequenceNumber: 1,
        visibleKey: 'NFR-SEC-0001',
        revisionNumber: 1,
        status: RequirementStatus.Approved,
        description: 'Audit-relevant security events must be written to an immutable log.',
        priority: 'p1',
        owner: 'Security Lead',
        rationale: 'Security incidents must be traceable after the fact.',
        source: 'Compliance baseline',
        rejectionReason: null,
        reviewer: 'Jane Reviewer',
        obsoletedBy: null,
        rejectedAt: null,
        approvedAt: new Date('2026-06-21T12:00:00.000Z'),
        implementedAt: null,
        obsolescenceReason: null,
        obsoleteAt: null,
        createdAt: new Date('2026-06-20T09:00:00.000Z'),
        updatedAt: new Date('2026-06-21T12:00:00.000Z'),
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e3003',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        categoryId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2001',
        sequenceNumber: 2,
        visibleKey: 'FR-AUTH-0002',
        revisionNumber: 1,
        status: RequirementStatus.Draft,
        description: 'Users may authenticate with a legacy username.',
        priority: 'p3',
        owner: 'Product Owner',
        rationale: 'Retained as a legacy authentication alternative for evaluation.',
        source: 'Legacy backlog',
        rejectionReason: null,
        reviewer: null,
        obsoletedBy: null,
        rejectedAt: null,
        approvedAt: null,
        implementedAt: null,
        obsolescenceReason: null,
        obsoleteAt: null,
        createdAt: new Date('2026-06-20T10:00:00.000Z'),
        updatedAt: new Date('2026-06-23T08:00:00.000Z'),
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e3004',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        categoryId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2012',
        sequenceNumber: 1,
        visibleKey: 'NFR-VAL-0001',
        revisionNumber: 2,
        status: RequirementStatus.Implemented,
        description: 'Imported requirements must be validated before they become visible in the project.',
        priority: 'p2',
        owner: 'Requirements Engineer',
        rationale: 'Bad imports must not corrupt the requirements catalog.',
        source: 'Import design review',
        rejectionReason: null,
        reviewer: 'Jane Reviewer',
        obsoletedBy: null,
        rejectedAt: null,
        approvedAt: new Date('2026-06-21T14:00:00.000Z'),
        implementedAt: new Date('2026-06-24T16:30:00.000Z'),
        obsolescenceReason: null,
        obsoleteAt: null,
        createdAt: new Date('2026-06-20T11:00:00.000Z'),
        updatedAt: new Date('2026-06-24T16:30:00.000Z'),
    },
];
