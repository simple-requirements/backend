import { RequirementStatus } from '@/projects/requirement-status.enum';
import type { RequirementRevision } from '@/projects/requirement-revisions.entity';

type DemoRequirementRevision = Pick<
    RequirementRevision,
    | 'id'
    | 'requirementId'
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

export const demoRequirementRevisions: readonly DemoRequirementRevision[] = [
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e4001',
        requirementId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e3001',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        categoryId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2001',
        sequenceNumber: 1,
        visibleKey: 'FR-AUTH-0001',
        revisionNumber: 1,
        status: RequirementStatus.Draft,
        description: 'Users must sign in with an email address and password.',
        priority: 'p1',
        owner: 'Product Owner',
        rationale: 'Protect user accounts.',
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
        updatedAt: new Date('2026-06-20T08:00:00.000Z'),
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e4002',
        requirementId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e3001',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1001',
        categoryId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2001',
        sequenceNumber: 1,
        visibleKey: 'FR-AUTH-0001',
        revisionNumber: 2,
        status: RequirementStatus.Approved,
        description: 'Users must sign in with an email address and password.',
        priority: 'p1',
        owner: 'Product Owner',
        rationale: 'Protect user accounts.',
        source: 'Security workshop',
        rejectionReason: null,
        reviewer: 'Jane Reviewer',
        obsoletedBy: null,
        rejectedAt: null,
        approvedAt: new Date('2026-06-21T09:00:00.000Z'),
        implementedAt: null,
        obsolescenceReason: null,
        obsoleteAt: null,
        createdAt: new Date('2026-06-20T08:00:00.000Z'),
        updatedAt: new Date('2026-06-21T09:00:00.000Z'),
    },
    {
        id: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e4003',
        requirementId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e3004',
        projectId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e1003',
        categoryId: '9c23b1f1-8b6a-4ff6-9c89-8f4f1f8e2012',
        sequenceNumber: 1,
        visibleKey: 'NFR-VAL-0001',
        revisionNumber: 1,
        status: RequirementStatus.Approved,
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
        implementedAt: null,
        obsolescenceReason: null,
        obsoleteAt: null,
        createdAt: new Date('2026-06-20T11:00:00.000Z'),
        updatedAt: new Date('2026-06-21T14:00:00.000Z'),
    },
];
