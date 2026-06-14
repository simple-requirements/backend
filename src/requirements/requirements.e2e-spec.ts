import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { cleanDatabase, closeE2eDataSource } from '@/database/database-test-utility';
import { RequirementStatus } from '@/requirements/requirement-status-enum';
import { RequirementType } from '@/requirements/requirement-type-enum';

interface ProjectApiResponse {
    id: string;
    name: string;
    requirementCount: number;
    createdAt: string;
    updatedAt: string;
}

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
    projectId: string;
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
    projectId: string;
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

async function createProject(request: APIRequestContext, name = 'Product A'): Promise<ProjectApiResponse> {
    const response = await request.post('/projects', { data: { name } });

    expect(response.status()).toBe(201);

    return (await response.json()) as ProjectApiResponse;
}

function requirementsPath(projectId: string, query = ''): string {
    const separator = query === '' ? '' : `&${query}`;

    return `/requirements?projectId=${projectId}${separator}`;
}

async function createCategory(
    request: APIRequestContext,
    name: string,
    key: string,
    type = RequirementType.NFR,
): Promise<CategoryApiResponse> {
    const response = await request.post('/categories', { data: { name, key, type } });

    expect(response.status()).toBe(201);

    return (await response.json()) as CategoryApiResponse;
}

async function createRequirement(
    request: APIRequestContext,
    projectId: string,
    categoryId: string,
    overrides: Partial<{
        description: string;
        priority: string;
        owner: string | null;
        rationale: string | null;
        source: string | null;
    }> = {},
): Promise<RequirementApiResponse> {
    const response = await request.post('/requirements', {
        data: {
            projectId,
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
    let project: ProjectApiResponse;
    let category: CategoryApiResponse;

    test.beforeEach(async ({ request }) => {
        await cleanDatabase();

        project = await createProject(request);
        category = await createCategory(request, 'Performance', 'PERF');
    });

    test.afterAll(async () => {
        await closeE2eDataSource();
    });

    test('Creates a draft requirement.', async ({ request }) => {
        const created = await createRequirement(request, project.id, category.id);

        expect(created).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                visibleKey: 'NFR-PERF-0001',
                type: RequirementType.NFR,
                projectId: project.id,
                categoryId: category.id,
                sequenceNumber: 1,
                status: RequirementStatus.Draft,
            }),
        );
    });

    test('Retrieves a draft requirement by internal ID.', async ({ request }) => {
        const created = await createRequirement(request, project.id, category.id);

        const response = await request.get(`/requirements/${created.id}`);

        expect(response.status()).toBe(200);

        const retrieved = (await response.json()) as RequirementApiResponse;

        expect(retrieved).toEqual(
            expect.objectContaining({
                id: created.id,
                visibleKey: created.visibleKey,
                type: created.type,
                projectId: created.projectId,
                categoryId: created.categoryId,
                sequenceNumber: created.sequenceNumber,
                status: RequirementStatus.Draft,
            }),
        );
    });

    test('Retrieves a draft requirement by its visible key.', async ({ request }) => {
        const created = await createRequirement(request, project.id, category.id);

        const response = await request.get(`/requirements/key/${created.visibleKey}`);

        expect(response.status()).toBe(200);

        const retrieved = (await response.json()) as RequirementApiResponse;

        expect(retrieved).toEqual(
            expect.objectContaining({
                id: created.id,
                visibleKey: created.visibleKey,
                type: created.type,
                projectId: created.projectId,
                categoryId: created.categoryId,
                sequenceNumber: created.sequenceNumber,
                status: RequirementStatus.Draft,
            }),
        );
    });

    test('Lists requirements.', async ({ request }) => {
        const category = await createCategory(request, 'Security', 'SEC', RequirementType.NFR);
        const createResponse = await request.post('/requirements', {
            data: {
                projectId: project.id,
                categoryId: category.id,
                description: 'The system records login events.',
                priority: 'p2',
            },
        });
        expect(createResponse.status()).toBe(201);

        const created = (await createResponse.json()) as RequirementApiResponse;
        const unscopedListResponse = await request.get('/requirements');
        expect(unscopedListResponse.status()).toBe(400);

        const listResponse = await request.get(requirementsPath(project.id));
        expect(listResponse.status()).toBe(200);
        const requirements = (await listResponse.json()) as RequirementApiResponse[];
        expect(requirements).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: created.id, visibleKey: created.visibleKey })]),
        );
    });

    test('Deletes a draft requirement while preserving its visible key reservation.', async ({ request }) => {
        const created = await createRequirement(request, project.id, category.id);

        const deleteResponse = await request.delete(`/requirements/${created.id}`);
        expect(deleteResponse.status()).toBe(204);

        const retrievedResponse = await request.get(`/requirements/${created.id}`);
        expect(retrievedResponse.status()).toBe(404);

        const second = await createRequirement(request, project.id, category.id);
        expect(second.visibleKey).toBe('NFR-PERF-0002');
        expect(second.sequenceNumber).toBe(2);
    });

    test('Rejects a draft requirement and excludes it from active lists unless explicitly requested.', async ({
        request,
    }) => {
        const created = await createRequirement(request, project.id, category.id);

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

        const defaultListResponse = await request.get(requirementsPath(project.id));
        expect(defaultListResponse.status()).toBe(200);
        const defaultList = (await defaultListResponse.json()) as RequirementApiResponse[];
        expect(defaultList).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id })]));

        const includeRejectedResponse = await request.get(requirementsPath(project.id, 'includeRejected=true'));
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
        const created = await createRequirement(request, project.id, category.id);

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
        const approvedFromDraft = await createRequirement(request, project.id, category.id);
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

        const approvedRejectResponse = await request.patch(`/requirements/${approved.id}/reject`, {
            data: { rejectionReason: 'Late rejection.', reviewer: 'QA Lead' },
        });
        expect(approvedRejectResponse.status()).toBe(409);

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

        const implementedObsoleteResponse = await request.patch(`/requirements/${implemented.id}/obsolete`, {
            data: { obsolescenceReason: ' Superseded by NFR-PERF-0002. ' },
        });
        expect(implementedObsoleteResponse.status()).toBe(409);

        const implementedRejectResponse = await request.patch(`/requirements/${implemented.id}/reject`, {
            data: { rejectionReason: 'Terminal state.', reviewer: 'QA Lead' },
        });
        expect(implementedRejectResponse.status()).toBe(409);

        const implementedApproveResponse = await request.patch(`/requirements/${implemented.id}/approve`);
        expect(implementedApproveResponse.status()).toBe(409);

        const implementedUpdateResponse = await request.patch(`/requirements/${implemented.id}`, {
            data: { description: 'Attempted implemented edit.' },
        });
        expect(implementedUpdateResponse.status()).toBe(409);

        const directObsoleteCandidate = await createRequirement(request, project.id, category.id, {
            description: 'The API should include cache hit metrics.',
        });
        const directlyApprovedResponse = await request.patch(`/requirements/${directObsoleteCandidate.id}/approve`);
        expect(directlyApprovedResponse.status()).toBe(200);
        const directlyObsoleteResponse = await request.patch(`/requirements/${directObsoleteCandidate.id}/obsolete`, {
            data: { obsolescenceReason: 'Metric replaced by trace coverage.' },
        });
        expect(directlyObsoleteResponse.status()).toBe(200);
        const approvedObsolete = (await directlyObsoleteResponse.json()) as RequirementApiResponse;
        expect(approvedObsolete).toEqual(
            expect.objectContaining({
                id: directObsoleteCandidate.id,
                status: RequirementStatus.Obsolete,
                obsolescenceReason: 'Metric replaced by trace coverage.',
                obsoleteAt: expect.any(String),
            }),
        );

        const obsoleteDeleteResponse = await request.delete(`/requirements/${approvedObsolete.id}`);
        expect(obsoleteDeleteResponse.status()).toBe(409);

        const obsoleteImplementedResponse = await request.patch(`/requirements/${approvedObsolete.id}/implemented`);
        expect(obsoleteImplementedResponse.status()).toBe(409);

        const obsoleteApproveResponse = await request.patch(`/requirements/${approvedObsolete.id}/approve`);
        expect(obsoleteApproveResponse.status()).toBe(409);

        const rejectedObsoleteCandidate = await createRequirement(request, project.id, category.id, {
            description: 'The API should record queue depth.',
        });
        const rejectedResponse = await request.patch(`/requirements/${rejectedObsoleteCandidate.id}/reject`, {
            data: { rejectionReason: 'Duplicate requirement.', reviewer: 'QA Lead' },
        });
        expect(rejectedResponse.status()).toBe(200);
        const rejectedObsoleteResponse = await request.patch(`/requirements/${rejectedObsoleteCandidate.id}/obsolete`, {
            data: { obsolescenceReason: 'Rejected duplicate archived.' },
        });
        expect(rejectedObsoleteResponse.status()).toBe(200);
        expect((await rejectedObsoleteResponse.json()) as RequirementApiResponse).toEqual(
            expect.objectContaining({
                id: rejectedObsoleteCandidate.id,
                status: RequirementStatus.Obsolete,
                obsolescenceReason: 'Rejected duplicate archived.',
            }),
        );

        const defaultListResponse = await request.get(requirementsPath(project.id));
        expect(defaultListResponse.status()).toBe(200);
        const defaultList = (await defaultListResponse.json()) as RequirementApiResponse[];
        expect(defaultList).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: approvedObsolete.id })]));

        const obsoleteStatusResponse = await request.get(requirementsPath(project.id, 'status=obsolete'));
        expect(obsoleteStatusResponse.status()).toBe(200);
        const obsoleteStatusList = (await obsoleteStatusResponse.json()) as RequirementApiResponse[];
        expect(obsoleteStatusList).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: approvedObsolete.id, status: RequirementStatus.Obsolete }),
                expect.objectContaining({ id: rejectedObsoleteCandidate.id, status: RequirementStatus.Obsolete }),
            ]),
        );
    });

    test('Rejects invalid remaining lifecycle transitions with meaningful errors.', async ({ request }) => {
        const draft = await createRequirement(request, project.id, category.id);

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
            expect.objectContaining({ message: 'Only approved or rejected requirements can be marked obsolete' }),
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
        const created = await createRequirement(request, project.id, category.id, { owner: 'Team A' });

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
                projectId: created.projectId,
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
        const created = await createRequirement(request, project.id, category.id, { owner: 'Team A' });

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
                projectId: created.projectId,
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
        const created = await createRequirement(request, project.id, category.id);

        const response = await request.patch(`/requirements/${created.id}`, {
            data: { categoryId: category.id, visibleKey: 'NFR-PERF-0001', description: 'Changed' },
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
                projectId: created.projectId,
                categoryId: created.categoryId,
                description: created.description,
            }),
        );
    });

    test('Creates requirements concurrently with unique sequential visible keys.', async ({ request }) => {
        const responses = await Promise.all(
            Array.from({ length: 5 }, (_, index) =>
                request.post('/requirements', {
                    data: {
                        projectId: project.id,
                        categoryId: category.id,
                        description: `Concurrent requirement ${index + 1}`,
                        priority: 'p3',
                        owner: 'Concurrent Team',
                    },
                }),
            ),
        );

        expect(responses.every((response) => response.status() === 201)).toBe(true);
        const created = (await Promise.all(responses.map((response) => response.json()))) as RequirementApiResponse[];
        const visibleKeys = created.map((requirement) => requirement.visibleKey).sort();
        const sequenceNumbers = created.map((requirement) => requirement.sequenceNumber).sort((a, b) => a - b);

        expect(new Set(visibleKeys).size).toBe(5);
        expect(new Set(sequenceNumbers).size).toBe(5);
        expect(visibleKeys).toEqual([
            'NFR-PERF-0001',
            'NFR-PERF-0002',
            'NFR-PERF-0003',
            'NFR-PERF-0004',
            'NFR-PERF-0005',
        ]);
        expect(sequenceNumbers).toEqual([1, 2, 3, 4, 5]);
    });

    test('Does not reuse visible keys after deletion, rejection, and a new database connection.', async ({
        request,
    }) => {
        const deleted = await createRequirement(request, project.id, category.id, { description: 'Delete me.' });
        const deleteResponse = await request.delete(`/requirements/${deleted.id}`);
        expect(deleteResponse.status()).toBe(204);

        await closeE2eDataSource();
        const afterDelete = await createRequirement(request, project.id, category.id, { description: 'After delete.' });
        expect(afterDelete.id).not.toBe(deleted.id);
        expect(afterDelete.visibleKey).toBe('NFR-PERF-0002');

        const rejected = await createRequirement(request, project.id, category.id, { description: 'Reject me.' });
        const rejectResponse = await request.patch(`/requirements/${rejected.id}/reject`, {
            data: { rejectionReason: 'Superseded before review.', reviewer: 'QA Lead' },
        });
        expect(rejectResponse.status()).toBe(200);

        await closeE2eDataSource();
        const afterReject = await createRequirement(request, project.id, category.id, { description: 'After reject.' });
        expect(afterReject.id).not.toBe(rejected.id);
        expect(afterReject.visibleKey).toBe('NFR-PERF-0004');

        const obsoleteCandidate = await createRequirement(request, project.id, category.id, {
            description: 'Obsolete me.',
        });
        const approveResponse = await request.patch(`/requirements/${obsoleteCandidate.id}/approve`);
        expect(approveResponse.status()).toBe(200);
        const obsoleteResponse = await request.patch(`/requirements/${obsoleteCandidate.id}/obsolete`, {
            data: { obsolescenceReason: 'Superseded.' },
        });
        expect(obsoleteResponse.status()).toBe(200);

        await closeE2eDataSource();
        const afterObsolete = await createRequirement(request, project.id, category.id, {
            description: 'After obsolete.',
        });
        expect(afterObsolete.id).not.toBe(obsoleteCandidate.id);
        expect(afterObsolete.visibleKey).toBe('NFR-PERF-0006');
        expect(afterObsolete.sequenceNumber).toBe(6);
    });

    test('Filters requirements by type, category, status, and owner.', async ({ request }) => {
        const security = await createCategory(request, 'Security', 'SEC', RequirementType.NFR);
        const functional = await createCategory(request, 'Functional', 'FUNC', RequirementType.FR);
        const perfNfr = await createRequirement(request, project.id, category.id, {
            owner: 'Team A',
            description: 'Perf NFR.',
        });
        const perfFr = await createRequirement(request, project.id, functional.id, {
            owner: 'Team B',
            description: 'Functional FR.',
        });
        const secNfr = await createRequirement(request, project.id, security.id, {
            owner: 'Team A',
            description: 'Sec NFR.',
        });
        const rejected = await createRequirement(request, project.id, functional.id, {
            owner: 'Team C',
            description: 'Rejected FR.',
        });
        const rejectResponse = await request.patch(`/requirements/${rejected.id}/reject`, {
            data: { rejectionReason: 'Not needed.', reviewer: 'QA Lead' },
        });
        expect(rejectResponse.status()).toBe(200);

        const byType = await request.get(requirementsPath(project.id, 'type=NFR'));
        expect(byType.status()).toBe(200);
        expect(((await byType.json()) as RequirementApiResponse[]).map((item) => item.id)).toEqual([
            perfNfr.id,
            secNfr.id,
        ]);

        const byTypeFr = await request.get(requirementsPath(project.id, 'type=FR&includeRejected=true'));
        expect(byTypeFr.status()).toBe(200);
        expect(((await byTypeFr.json()) as RequirementApiResponse[]).map((item) => item.id)).toEqual([
            perfFr.id,
            rejected.id,
        ]);

        const byCategory = await request.get(requirementsPath(project.id, `categoryId=${security.id}`));
        expect(byCategory.status()).toBe(200);
        expect(((await byCategory.json()) as RequirementApiResponse[]).map((item) => item.id)).toEqual([secNfr.id]);

        const byStatus = await request.get(requirementsPath(project.id, 'status=rejected'));
        expect(byStatus.status()).toBe(200);
        expect(((await byStatus.json()) as RequirementApiResponse[]).map((item) => item.id)).toEqual([rejected.id]);

        const combined = await request.get(
            requirementsPath(project.id, `type=NFR&categoryId=${security.id}&owner=Team%20A`),
        );
        expect(combined.status()).toBe(200);
        expect(((await combined.json()) as RequirementApiResponse[]).map((item) => item.id)).toEqual([secNfr.id]);

        const empty = await request.get(requirementsPath(project.id, 'owner=Nobody'));
        expect(empty.status()).toBe(200);
        expect((await empty.json()) as RequirementApiResponse[]).toEqual([]);

        const obsolete = await request.get(requirementsPath(project.id, 'status=obsolete'));
        expect(obsolete.status()).toBe(200);
        expect((await obsolete.json()) as RequirementApiResponse[]).toEqual([]);

        const invalid = await request.get(requirementsPath(project.id, 'status=archived'));
        expect(invalid.status()).toBe(400);
    });

    test('Returns consistent error response structures.', async ({ request }) => {
        const malformed = await request.post('/requirements', { data: { type: 'BUG' } });
        expect(malformed.status()).toBe(400);
        await expect(malformed.json()).resolves.toEqual(
            expect.objectContaining({ statusCode: 400, message: expect.any(String) }),
        );

        const unknown = await request.get('/requirements/key/NFR-PERF-9999');
        expect(unknown.status()).toBe(404);
        await expect(unknown.json()).resolves.toEqual(
            expect.objectContaining({ statusCode: 404, message: expect.any(String) }),
        );

        const created = await createRequirement(request, project.id, category.id);
        const rejectResponse = await request.patch(`/requirements/${created.id}/reject`, {
            data: { rejectionReason: 'Duplicate.', reviewer: 'QA Lead' },
        });
        expect(rejectResponse.status()).toBe(200);
        const conflict = await request.patch(`/requirements/${created.id}`, { data: { description: 'Cannot edit.' } });
        expect(conflict.status()).toBe(409);
        await expect(conflict.json()).resolves.toEqual(
            expect.objectContaining({ statusCode: 409, message: expect.any(String) }),
        );
    });

    test('Rejects invalid requirement creation requests.', async ({ request }) => {
        const invalidTypeResponse = await request.post('/requirements', {
            data: {
                type: 'BUG',
                projectId: project.id,
                categoryId: 'missing',
                description: 'Description',
                priority: 'p3',
            },
        });

        expect(invalidTypeResponse.status()).toBe(400);

        const invalidPriorityResponse = await request.post('/requirements', {
            data: { projectId: project.id, categoryId: category.id, description: 'Description', priority: 'high' },
        });

        expect(invalidPriorityResponse.status()).toBe(400);
        expect(await invalidPriorityResponse.json()).toEqual(
            expect.objectContaining({ message: 'Requirement priority must be p1, p2, or p3' }),
        );
    });

    test('Returns not found for unknown requirements.', async ({ request }) => {
        const response = await request.get('/requirements/key/NFR-PERF-9999');

        expect(response.status()).toBe(404);
    });
});
