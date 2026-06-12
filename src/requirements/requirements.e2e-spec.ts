import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { cleanDatabase, closeE2eDataSource } from '@/database/database-test-utility';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';

interface CategoryApiResponse {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    updatedAt: string;
}

interface RequirementApiResponse {
    id: string;
    visibleKey: string;
    type: RequirementType;
    categoryId: string;
    sequenceNumber: number;
    status: RequirementStatus;
    description: string;
    priority: string;
    owner: string | null;
    rationale: string | null;
    source: string | null;
    rejectionReason: string | null;
    reviewer: string | null;
    rejectedAt: string | null;
    deletedAt: string | null;
    approvedAt: string | null;
    implementedAt: string | null;
    obsolescenceReason: string | null;
    obsoleteAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface RequirementRevisionApiResponse {
    id: string;
    requirementId: string;
    revisionNumber: number;
    visibleKey: string;
    type: RequirementType;
    categoryId: string;
    sequenceNumber: number;
    status: RequirementStatus;
    description: string;
    priority: string;
    owner: string | null;
    rationale: string | null;
    source: string | null;
    rejectionReason: string | null;
    reviewer: string | null;
    rejectedAt: string | null;
    deletedAt: string | null;
    approvedAt: string | null;
    implementedAt: string | null;
    obsolescenceReason: string | null;
    obsoleteAt: string | null;
    requirementCreatedAt: string;
    requirementUpdatedAt: string;
    createdAt: string;
}

async function createCategory(request: APIRequestContext, name: string, key: string): Promise<CategoryApiResponse> {
    const response = await request.post('/categories', { data: { name, key } });

    expect(response.status()).toBe(201);

    return (await response.json()) as CategoryApiResponse;
}

async function createRequirement(
    request: APIRequestContext,
    categoryId: string,
    overrides: Partial<{
        type: RequirementType;
        description: string;
        priority: string;
        owner: string | null;
        rationale: string | null;
        source: string | null;
    }> = {},
): Promise<RequirementApiResponse> {
    const response = await request.post('/requirements', {
        data: {
            type: RequirementType.NFR,
            categoryId,
            description: 'The API should respond quickly for interactive users.',
            priority: 'p3',
            owner: null,
            rationale: 'Latency impacts user trust.',
            source: 'US-REQ-001',
            ...overrides,
        },
    });

    expect(response.status()).toBe(201);

    return (await response.json()) as RequirementApiResponse;
}

test.describe('requirements API', () => {
    let category: CategoryApiResponse;

    test.beforeEach(async ({ request }) => {
        await cleanDatabase();

        category = await createCategory(request, 'Performance', 'PERF');
    });

    test.afterAll(async () => {
        await closeE2eDataSource();
    });

    test('Creates a draft requirement.', async ({ request }) => {
        const created = await createRequirement(request, category.id);

        expect(created).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                visibleKey: 'NFR-PERF-0001',
                type: RequirementType.NFR,
                categoryId: category.id,
                sequenceNumber: 1,
                status: RequirementStatus.Draft,
            }),
        );
    });

    test('Retrieves a draft requirement by internal ID.', async ({ request }) => {
        const created = await createRequirement(request, category.id);

        const response = await request.get(`/requirements/${created.id}`);

        expect(response.status()).toBe(200);

        const retrieved = (await response.json()) as RequirementApiResponse;

        expect(retrieved).toEqual(
            expect.objectContaining({
                id: created.id,
                visibleKey: created.visibleKey,
                type: created.type,
                categoryId: created.categoryId,
                sequenceNumber: created.sequenceNumber,
                status: RequirementStatus.Draft,
            }),
        );
    });

    test('Retrieves a draft requirement by its visible key.', async ({ request }) => {
        const created = await createRequirement(request, category.id);

        const response = await request.get(`/requirements/key/${created.visibleKey}`);

        expect(response.status()).toBe(200);

        const retrieved = (await response.json()) as RequirementApiResponse;

        expect(retrieved).toEqual(
            expect.objectContaining({
                id: created.id,
                visibleKey: created.visibleKey,
                type: created.type,
                categoryId: created.categoryId,
                sequenceNumber: created.sequenceNumber,
                status: RequirementStatus.Draft,
            }),
        );
    });

    test('Lists requirements.', async ({ request }) => {
        const categoryKey = 'SEC';
        const categoryResponse = await request.post('/categories', { data: { name: 'Security', key: categoryKey } });
        expect(categoryResponse.status()).toBe(201);

        const category = (await categoryResponse.json()) as CategoryApiResponse;
        const createResponse = await request.post('/requirements', {
            data: {
                type: RequirementType.NFR,
                categoryId: category.id,
                description: 'The system records login events.',
                priority: 'p2',
            },
        });
        expect(createResponse.status()).toBe(201);

        const created = (await createResponse.json()) as RequirementApiResponse;
        const listResponse = await request.get('/requirements');
        expect(listResponse.status()).toBe(200);
        const requirements = (await listResponse.json()) as RequirementApiResponse[];
        expect(requirements).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: created.id, visibleKey: created.visibleKey })]),
        );
    });

    test('Deletes a draft requirement while preserving its visible key reservation.', async ({ request }) => {
        const created = await createRequirement(request, category.id);

        const deleteResponse = await request.delete(`/requirements/${created.id}`);
        expect(deleteResponse.status()).toBe(204);

        const retrievedResponse = await request.get(`/requirements/${created.id}`);
        expect(retrievedResponse.status()).toBe(404);

        const second = await createRequirement(request, category.id);
        expect(second.visibleKey).toBe('NFR-PERF-0002');
        expect(second.sequenceNumber).toBe(2);
    });

    test('Rejects a draft requirement and excludes it from active lists unless explicitly requested.', async ({
        request,
    }) => {
        const created = await createRequirement(request, category.id);

        const rejectResponse = await request.patch(`/requirements/${created.id}/reject`, {
            data: { rejectionReason: 'Does not describe observable behavior.', reviewer: 'QA Lead' },
        });
        expect(rejectResponse.status()).toBe(200);

        const rejected = (await rejectResponse.json()) as RequirementApiResponse;
        expect(rejected).toEqual(
            expect.objectContaining({
                id: created.id,
                status: RequirementStatus.Rejected,
                rejectionReason: 'Does not describe observable behavior.',
                reviewer: 'QA Lead',
                rejectedAt: expect.any(String),
            }),
        );

        const defaultListResponse = await request.get('/requirements');
        expect(defaultListResponse.status()).toBe(200);
        const defaultList = (await defaultListResponse.json()) as RequirementApiResponse[];
        expect(defaultList).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id })]));

        const includeRejectedResponse = await request.get('/requirements?includeRejected=true');
        expect(includeRejectedResponse.status()).toBe(200);
        const includeRejectedList = (await includeRejectedResponse.json()) as RequirementApiResponse[];
        expect(includeRejectedList).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: created.id, status: RequirementStatus.Rejected })]),
        );

        const explicitResponse = await request.get(`/requirements/${created.id}`);
        expect(explicitResponse.status()).toBe(200);
        expect((await explicitResponse.json()) as RequirementApiResponse).toEqual(
            expect.objectContaining({ id: created.id, status: RequirementStatus.Rejected }),
        );
    });

    test('Requires a rejection reason and prevents deleting rejected requirements.', async ({ request }) => {
        const created = await createRequirement(request, category.id);

        const invalidRejectResponse = await request.patch(`/requirements/${created.id}/reject`, {
            data: { rejectionReason: ' ', reviewer: 'QA Lead' },
        });
        expect(invalidRejectResponse.status()).toBe(400);

        const rejectResponse = await request.patch(`/requirements/${created.id}/reject`, {
            data: { rejectionReason: 'Duplicate requirement.', reviewer: 'QA Lead' },
        });
        expect(rejectResponse.status()).toBe(200);

        const deleteResponse = await request.delete(`/requirements/${created.id}`);
        expect(deleteResponse.status()).toBe(409);
    });

    test('Approves, implements, and obsoletes controlled requirements while protecting them from deletion.', async ({
        request,
    }) => {
        const approvedFromDraft = await createRequirement(request, category.id);
        const approveResponse = await request.patch(`/requirements/${approvedFromDraft.id}/approve`);
        expect(approveResponse.status()).toBe(200);
        const approved = (await approveResponse.json()) as RequirementApiResponse;
        expect(approved).toEqual(
            expect.objectContaining({
                id: approvedFromDraft.id,
                status: RequirementStatus.Approved,
                approvedAt: expect.any(String),
            }),
        );

        const approvedDeleteResponse = await request.delete(`/requirements/${approved.id}`);
        expect(approvedDeleteResponse.status()).toBe(409);

        const implementedResponse = await request.patch(`/requirements/${approved.id}/implemented`);
        expect(implementedResponse.status()).toBe(200);
        const implemented = (await implementedResponse.json()) as RequirementApiResponse;
        expect(implemented).toEqual(
            expect.objectContaining({
                id: approved.id,
                status: RequirementStatus.Implemented,
                approvedAt: approved.approvedAt,
                implementedAt: expect.any(String),
            }),
        );

        const implementedDeleteResponse = await request.delete(`/requirements/${implemented.id}`);
        expect(implementedDeleteResponse.status()).toBe(409);

        const obsoleteResponse = await request.patch(`/requirements/${implemented.id}/obsolete`, {
            data: { obsolescenceReason: ' Superseded by NFR-PERF-0002. ' },
        });
        expect(obsoleteResponse.status()).toBe(200);
        const obsolete = (await obsoleteResponse.json()) as RequirementApiResponse;
        expect(obsolete).toEqual(
            expect.objectContaining({
                id: implemented.id,
                status: RequirementStatus.Obsolete,
                obsolescenceReason: 'Superseded by NFR-PERF-0002.',
                obsoleteAt: expect.any(String),
            }),
        );

        const obsoleteDeleteResponse = await request.delete(`/requirements/${obsolete.id}`);
        expect(obsoleteDeleteResponse.status()).toBe(409);

        const directObsoleteCandidate = await createRequirement(request, category.id, {
            description: 'The API should include cache hit metrics.',
        });
        const directlyApprovedResponse = await request.patch(`/requirements/${directObsoleteCandidate.id}/approve`);
        expect(directlyApprovedResponse.status()).toBe(200);
        const directlyObsoleteResponse = await request.patch(`/requirements/${directObsoleteCandidate.id}/obsolete`, {
            data: { obsolescenceReason: 'Metric replaced by trace coverage.' },
        });
        expect(directlyObsoleteResponse.status()).toBe(200);
        expect((await directlyObsoleteResponse.json()) as RequirementApiResponse).toEqual(
            expect.objectContaining({
                id: directObsoleteCandidate.id,
                status: RequirementStatus.Obsolete,
                obsolescenceReason: 'Metric replaced by trace coverage.',
                obsoleteAt: expect.any(String),
            }),
        );

        const defaultListResponse = await request.get('/requirements');
        expect(defaultListResponse.status()).toBe(200);
        const defaultList = (await defaultListResponse.json()) as RequirementApiResponse[];
        expect(defaultList).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: obsolete.id })]));

        const includeObsoleteResponse = await request.get('/requirements?includeObsolete=true');
        expect(includeObsoleteResponse.status()).toBe(200);
        const includeObsoleteList = (await includeObsoleteResponse.json()) as RequirementApiResponse[];
        expect(includeObsoleteList).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: obsolete.id, status: RequirementStatus.Obsolete })]),
        );
    });

    test('Rejects invalid remaining lifecycle transitions with meaningful errors.', async ({ request }) => {
        const draft = await createRequirement(request, category.id);

        const invalidImplementedResponse = await request.patch(`/requirements/${draft.id}/implemented`);
        expect(invalidImplementedResponse.status()).toBe(409);
        expect(await invalidImplementedResponse.json()).toEqual(
            expect.objectContaining({ message: 'Only approved requirements can be marked implemented' }),
        );

        const invalidObsoleteResponse = await request.patch(`/requirements/${draft.id}/obsolete`, {
            data: { obsolescenceReason: 'No longer needed.' },
        });
        expect(invalidObsoleteResponse.status()).toBe(409);
        expect(await invalidObsoleteResponse.json()).toEqual(
            expect.objectContaining({ message: 'Only approved or implemented requirements can be marked obsolete' }),
        );

        const approvedResponse = await request.patch(`/requirements/${draft.id}/approve`);
        expect(approvedResponse.status()).toBe(200);

        const invalidApproveResponse = await request.patch(`/requirements/${draft.id}/approve`);
        expect(invalidApproveResponse.status()).toBe(409);
        expect(await invalidApproveResponse.json()).toEqual(
            expect.objectContaining({ message: 'Only draft requirements can be approved' }),
        );

        const missingReasonResponse = await request.patch(`/requirements/${draft.id}/obsolete`, {
            data: { obsolescenceReason: ' ' },
        });
        expect(missingReasonResponse.status()).toBe(400);
        expect(await missingReasonResponse.json()).toEqual(
            expect.objectContaining({ message: 'Requirement obsolescence reason is required' }),
        );
    });

    test('Updates editable draft requirement fields while preserving identity and classification.', async ({
        request,
    }) => {
        const created = await createRequirement(request, category.id, { owner: 'Team A' });

        const response = await request.patch(`/requirements/${created.id}`, {
            data: {
                description: ' The API should respond within 250 ms. ',
                priority: ' p1 ',
                owner: ' Team B ',
                rationale: ' Faster responses improve conversion. ',
                source: ' US-REQ-004 ',
            },
        });

        expect(response.status()).toBe(200);

        const updated = (await response.json()) as RequirementApiResponse;

        expect(updated).toEqual(
            expect.objectContaining({
                id: created.id,
                visibleKey: created.visibleKey,
                type: created.type,
                categoryId: created.categoryId,
                sequenceNumber: created.sequenceNumber,
                description: 'The API should respond within 250 ms.',
                priority: 'p1',
                owner: 'Team B',
                rationale: 'Faster responses improve conversion.',
                source: 'US-REQ-004',
            }),
        );
    });

    test('Creates immutable previous-version snapshots and retrieves revision history.', async ({ request }) => {
        const created = await createRequirement(request, category.id, { owner: 'Team A' });

        const response = await request.patch(`/requirements/${created.id}`, {
            data: { description: 'The API should respond within 250 ms.', owner: 'Team B', source: 'US-REQ-005' },
        });
        expect(response.status()).toBe(200);

        const historyResponse = await request.get(`/requirements/${created.id}/revisions`);
        expect(historyResponse.status()).toBe(200);

        const history = (await historyResponse.json()) as RequirementRevisionApiResponse[];
        expect(history).toHaveLength(1);
        expect(history[0]).toEqual(
            expect.objectContaining({
                requirementId: created.id,
                revisionNumber: 1,
                visibleKey: created.visibleKey,
                type: created.type,
                categoryId: created.categoryId,
                sequenceNumber: created.sequenceNumber,
                description: created.description,
                priority: created.priority,
                owner: 'Team A',
                rationale: created.rationale,
                source: created.source,
                requirementCreatedAt: created.createdAt,
                requirementUpdatedAt: created.updatedAt,
            }),
        );

        const revisionResponse = await request.get(`/requirements/${created.id}/revisions/1`);
        expect(revisionResponse.status()).toBe(200);
        expect((await revisionResponse.json()) as RequirementRevisionApiResponse).toEqual(
            expect.objectContaining({ requirementId: created.id, revisionNumber: 1, description: created.description }),
        );
    });

    test('Rejects reclassification and identity changes during normal editing.', async ({ request }) => {
        const created = await createRequirement(request, category.id);

        const response = await request.patch(`/requirements/${created.id}`, {
            data: {
                type: RequirementType.NFR,
                categoryId: category.id,
                visibleKey: 'NFR-PERF-0001',
                description: 'Changed',
            },
        });

        expect(response.status()).toBe(400);

        const retrievedResponse = await request.get(`/requirements/${created.id}`);
        expect(retrievedResponse.status()).toBe(200);
        const retrieved = (await retrievedResponse.json()) as RequirementApiResponse;
        expect(retrieved).toEqual(
            expect.objectContaining({
                id: created.id,
                visibleKey: created.visibleKey,
                type: created.type,
                categoryId: created.categoryId,
                description: created.description,
            }),
        );
    });

    test('Rejects invalid requirement creation requests.', async ({ request }) => {
        const response = await request.post('/requirements', {
            data: { type: 'BUG', categoryId: 'missing', description: 'Description', priority: 'p3' },
        });

        expect(response.status()).toBe(400);
    });

    test('Returns not found for unknown requirements.', async ({ request }) => {
        const response = await request.get('/requirements/key/NFR-PERF-9999');

        expect(response.status()).toBe(404);
    });
});
