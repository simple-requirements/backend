import { randomUUID } from 'node:crypto';

import type { APIRequestContext } from '@playwright/test';

import { expect, test } from '@/projects/projects-api.e2e-fixtures';

import { CategoryType } from '@/projects/category-type.enum';
import { RequirementStatus } from '@/projects/requirement-status.enum';
import {
    E2E_REQUIREMENTS_ENGINEER_HEADERS,
    expectErrorResponseBody,
    expectIsoDateString,
    expectRequirementResponseBody,
    type ErrorResponseBody,
    type RequirementResponseBody,
} from '@/projects/projects-api.e2e-helpers';


type MetricBody = Readonly<{ id: string; key: string; active: boolean }>;

async function createMetric(request: APIRequestContext, projectId: string, value = '2000 ms'): Promise<MetricBody> {
    const response = await request.post(`/projects/${projectId}/metrics`, {
        headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        data: { value, description: 'Requirement metric reference test' },
    });
    expect(response.status()).toBe(201);
    return (await response.json()) as MetricBody;
}

test.describe('Requirements API - POST /projects/{projectId}/requirements', () => {
    test('creates draft requirements with generated visible keys.', async ({ api }) => {
        const project = await api.createProject(`Playwright API requirement project ${randomUUID()}`);
        const functionalCategory = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const nonFunctionalCategory = await api.createCategory(project.id, 'Performance', 'PERF', CategoryType.NFR);

        const firstRequirement = await api.createRequirement(project.id, functionalCategory.id, 'Users must sign in.');
        const secondRequirement = await api.createRequirement(
            project.id,
            functionalCategory.id,
            'Users must sign out.',
        );
        const thirdRequirement = await api.createRequirement(
            project.id,
            nonFunctionalCategory.id,
            'Search must be fast.',
        );

        expectRequirementResponseBody(firstRequirement, {
            projectId: project.id,
            categoryId: functionalCategory.id,
            visibleKey: 'FR-AUTH-0001',
            revisionNumber: 1,
            status: RequirementStatus.Draft,
            description: 'Users must sign in.',
            priority: 'p1',
        });
        expect(secondRequirement.visibleKey).toBe('FR-AUTH-0002');
        expect(thirdRequirement.visibleKey).toBe('NFR-PERF-0001');
    });

    test('returns 404 when creating a requirement with a category from another project.', async ({ request, api }) => {
        const firstProject = await api.createProject(`Playwright API requirement first project ${randomUUID()}`);
        const secondProject = await api.createProject(`Playwright API requirement second project ${randomUUID()}`);
        const category = await api.createCategory(secondProject.id, 'Authentication', 'AUTH', CategoryType.FR);

        const response = await request.post(`/projects/${firstProject.id}/requirements`, {
            data: { categoryId: category.id, description: 'Users must sign in.' },
        });

        expect(response.status()).toBe(404);

        const body = (await response.json()) as ErrorResponseBody;

        expectErrorResponseBody(
            body,
            404,
            `Category with id "${category.id}" in project "${firstProject.id}" was not found.`,
            'Not Found',
        );
    });
});

test.describe('Requirement metric references', () => {
    test('resolves project-local placeholders, deduplicates repeated references, and reports unknown keys.', async ({ request, api }) => {
        const project = await api.createProject(`Requirement metrics ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Performance', 'PERF', CategoryType.NFR);
        const metric = await createMetric(request, project.id);

        const requirement = await api.createRequirement(
            project.id,
            category.id,
            'Below [~MET-0001], repeated [~MET-0001], unknown [~MET-9999], malformed [~UNKNOWN].',
        );

        expect(requirement.description).toContain('[~MET-0001]');
        expect(requirement.metricReferences).toEqual([
            { key: 'MET-0001', metricId: metric.id, value: '2000 ms', resolved: true, active: true },
            { key: 'MET-9999', metricId: null, value: null, resolved: false, active: null },
        ]);
    });

    test('does not resolve a same-key metric from another project.', async ({ request, api }) => {
        const project = await api.createProject(`Requirement metric scope A ${randomUUID()}`);
        const otherProject = await api.createProject(`Requirement metric scope B ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Performance', 'PERF', CategoryType.NFR);
        await createMetric(request, otherProject.id);

        const requirement = await api.createRequirement(project.id, category.id, 'Below [~MET-0001].');
        expect(requirement.metricReferences).toEqual([
            { key: 'MET-0001', metricId: null, value: null, resolved: false, active: null },
        ]);
    });

    test('recalculates links after edits and preserves existing links after deactivation.', async ({ request, api }) => {
        const project = await api.createProject(`Requirement metric edits ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Performance', 'PERF', CategoryType.NFR);
        const firstMetric = await createMetric(request, project.id);
        const secondMetric = await createMetric(request, project.id, '1000 ms');
        const requirement = await api.createRequirement(project.id, category.id, 'Below [~MET-0001].');

        const replaceResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { description: 'Below [~MET-0002].', changeReason: 'Use the newer target.' },
        });
        expect(replaceResponse.status()).toBe(200);
        expect(((await replaceResponse.json()) as RequirementResponseBody).metricReferences).toEqual([
            { key: 'MET-0002', metricId: secondMetric.id, value: '1000 ms', resolved: true, active: true },
        ]);

        expect(
            (await request.post(`/projects/${project.id}/metrics/${secondMetric.id}/deactivate`, {
                headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            })).status(),
        ).toBe(200);
        const retainResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { description: 'Still below [~MET-0002].', changeReason: 'Clarify wording.' },
        });
        expect(retainResponse.status()).toBe(200);
        expect(((await retainResponse.json()) as RequirementResponseBody).metricReferences).toEqual([
            { key: 'MET-0002', metricId: secondMetric.id, value: '1000 ms', resolved: true, active: false },
        ]);
        expect(firstMetric.id).not.toBe(secondMetric.id);
    });

    test('rejects newly introduced references to already-deactivated metrics.', async ({ request, api }) => {
        const project = await api.createProject(`Requirement metric inactive ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Performance', 'PERF', CategoryType.NFR);
        const metric = await createMetric(request, project.id);
        await request.post(`/projects/${project.id}/metrics/${metric.id}/deactivate`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
        });

        const response = await request.post(`/projects/${project.id}/requirements`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { categoryId: category.id, description: 'Below [~MET-0001].' },
        });
        expect(response.status()).toBe(400);
        expect(((await response.json()) as ErrorResponseBody).message).toContain(
            'Metric reference "MET-0001" cannot be added because the metric is deactivated.',
        );
    });

    test('blocks approval while unresolved valid metric references remain.', async ({ request, api }) => {
        const project = await api.createProject(`Requirement metric approval ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Performance', 'PERF', CategoryType.NFR);
        const requirement = await api.createRequirement(project.id, category.id, 'Below [~MET-9999].');

        const response = await request.post(`/projects/${project.id}/requirements/${requirement.id}/review/approve`, {
            headers: E2E_REQUIREMENTS_ENGINEER_HEADERS,
            data: { reviewer: 'Requirements Engineer' },
        });
        expect(response.status()).toBe(400);
        expect(((await response.json()) as ErrorResponseBody).message).toContain(
            'Requirement cannot be approved while metric references are unresolved: MET-9999.',
        );
    });
});

test.describe('Requirements API - GET /projects/{projectId}/requirements', () => {
    test('gets and lists requirements of a project.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API list requirements project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id);

        const getResponse = await request.get(`/projects/${project.id}/requirements/${requirement.id}`);

        expect(getResponse.status()).toBe(200);

        const getBody = (await getResponse.json()) as RequirementResponseBody;

        expectRequirementResponseBody(getBody, {
            id: requirement.id,
            projectId: project.id,
            categoryId: category.id,
            visibleKey: 'FR-AUTH-0001',
            status: RequirementStatus.Draft,
        });

        const listResponse = await request.get(`/projects/${project.id}/requirements`);

        expect(listResponse.status()).toBe(200);

        const listBody = (await listResponse.json()) as readonly RequirementResponseBody[];

        expect(listBody.map((listedRequirement) => listedRequirement.id)).toContain(requirement.id);
    });
});

test.describe('Requirements API - PATCH /projects/{projectId}/requirements/{requirementId}', () => {
    test('uses review decisions for approval and keeps generic PATCH for later lifecycle transitions.', async ({
        request,
        api,
        draftRequirement,
    }) => {
        const { project, category, requirement } = draftRequirement;

        const genericApprovalResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { status: RequirementStatus.Approved, reviewer: 'Requirements Engineer' },
        });

        expect(genericApprovalResponse.status()).toBe(400);
        expect(((await genericApprovalResponse.json()) as ErrorResponseBody).message).toContain(
            'Requirement approval and rejection must use the review decision endpoints.',
        );

        const approvedRequirement = await api.approveRequirement(project.id, requirement.id);

        expectRequirementResponseBody(approvedRequirement, {
            id: requirement.id,
            projectId: project.id,
            categoryId: category.id,
            revisionNumber: 2,
            status: RequirementStatus.Approved,
        });
        expect(approvedRequirement.reviewer).toBe('Requirements Engineer');
        expect(approvedRequirement.approvedAt).not.toBeNull();

        if (approvedRequirement.approvedAt !== null) {
            expectIsoDateString(approvedRequirement.approvedAt);
        }

        const rejectApprovedResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: {
                status: RequirementStatus.Rejected,
                reviewer: 'Requirements Engineer',
                rejectionReason: 'Not needed.',
            },
        });

        expect(rejectApprovedResponse.status()).toBe(400);
        expect(((await rejectApprovedResponse.json()) as ErrorResponseBody).message).toContain(
            'Requirement approval and rejection must use the review decision endpoints.',
        );

        const implementationTicket = await api.createImplementationTicket(
            project.id,
            requirement.id,
            'SOLAR-4711',
            'Ada Developer',
        );
        expect(implementationTicket.completedBy).toBe('Ada Developer');

        const implementResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { status: RequirementStatus.Implemented },
        });

        expect(implementResponse.status()).toBe(200);

        const implementedRequirement = (await implementResponse.json()) as RequirementResponseBody;

        expect(implementedRequirement.status).toBe(RequirementStatus.Implemented);
        expect(implementedRequirement.revisionNumber).toBe(4);
        expect(implementedRequirement.implementedAt).not.toBeNull();

        if (implementedRequirement.implementedAt !== null) {
            expectIsoDateString(implementedRequirement.implementedAt);
        }
    });

    test('changes an approved requirement while preserving its approved lifecycle state.', async ({
        request,
        api,
        draftRequirement,
    }) => {
        const { project, category, requirement } = draftRequirement;

        await api.approveRequirement(project.id, requirement.id);

        const updateResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: {
                description: 'Users must sign in with MFA.',
                priority: 'p2',
                changeReason: 'Clarified authentication behavior.',
            },
        });

        expect(updateResponse.status()).toBe(200);

        const updatedRequirement = (await updateResponse.json()) as RequirementResponseBody;

        expectRequirementResponseBody(updatedRequirement, {
            id: requirement.id,
            projectId: project.id,
            categoryId: category.id,
            revisionNumber: 3,
            status: RequirementStatus.Approved,
            description: 'Users must sign in with MFA.',
            priority: 'p2',
        });
        expect(updatedRequirement.reviewer).toBe('Requirements Engineer');
        expect(updatedRequirement.approvedAt).not.toBeNull();
    });

    test('requires an explicit change reason for substantive requirement edits.', async ({
        request,
        draftRequirement,
    }) => {
        const { project, requirement } = draftRequirement;

        const response = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Clarified draft text.' },
        });

        expect(response.status()).toBe(400);
        const body = (await response.json()) as ErrorResponseBody;
        expect(body.message).toContain('Change reason is required when changing requirement content or metadata.');
    });

    test('does not allow a draft requirement to become obsolete.', async ({ request, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        const response = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: {
                status: RequirementStatus.Obsolete,
                obsoletedBy: 'Requirements Engineer',
                obsolescenceReason: 'No longer needed.',
            },
        });

        expect(response.status()).toBe(400);
        const body = (await response.json()) as ErrorResponseBody;
        expectErrorResponseBody(body, 400, 'Requirement in status "draft" cannot be set obsolete.', 'Bad Request');
    });

    test('sets an approved requirement obsolete.', async ({ request, api, draftRequirement }) => {
        const { project, category, requirement } = draftRequirement;

        await api.approveRequirement(project.id, requirement.id);

        const obsoleteResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: {
                status: RequirementStatus.Obsolete,
                obsoletedBy: 'Requirements Engineer',
                obsolescenceReason: 'Replaced by a more specific requirement.',
            },
        });

        expect(obsoleteResponse.status()).toBe(200);

        const obsoleteRequirement = (await obsoleteResponse.json()) as RequirementResponseBody;

        expectRequirementResponseBody(obsoleteRequirement, {
            id: requirement.id,
            projectId: project.id,
            categoryId: category.id,
            revisionNumber: 3,
            status: RequirementStatus.Obsolete,
        });
        expect(obsoleteRequirement.obsolescenceReason).toBe('Replaced by a more specific requirement.');
        expect(obsoleteRequirement.obsoletedBy).toBe('Requirements Engineer');
        expect(obsoleteRequirement.reviewer).toBe('Requirements Engineer');
        expect(obsoleteRequirement.obsoleteAt).not.toBeNull();
    });

    test('does not change implemented requirements.', async ({ request, api, draftRequirement }) => {
        const { project, requirement } = draftRequirement;

        await api.approveRequirement(project.id, requirement.id);
        await api.createImplementationTicket(project.id, requirement.id, 'SOLAR-4712');

        const implementResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { status: RequirementStatus.Implemented },
        });
        expect(implementResponse.status()).toBe(200);

        const updateResponse = await request.patch(`/projects/${project.id}/requirements/${requirement.id}`, {
            data: { description: 'Changed after implementation.', changeReason: 'Attempted post-implementation edit.' },
        });

        expect(updateResponse.status()).toBe(400);

        const body = (await updateResponse.json()) as ErrorResponseBody;

        expectErrorResponseBody(body, 400, 'Requirement in status "implemented" cannot be changed.', 'Bad Request');
    });
});

test.describe('Requirements API - no requirement deletion', () => {
    test('does not expose requirement deletion or recycle-bin behavior.', async ({ request, api }) => {
        const project = await api.createProject(`Playwright API no requirement delete project ${randomUUID()}`);
        const category = await api.createCategory(project.id, 'Authentication', 'AUTH', CategoryType.FR);
        const requirement = await api.createRequirement(project.id, category.id, 'Draft that must remain retained.');

        const deleteResponse = await request.delete(`/projects/${project.id}/requirements/${requirement.id}`);

        expect(deleteResponse.status()).toBe(404);

        const listedRequirementsResponse = await request.get(`/projects/${project.id}/requirements?deleted`);
        const listedRequirements = (await listedRequirementsResponse.json()) as readonly RequirementResponseBody[];

        expect(listedRequirements.map((item) => item.id)).toContain(requirement.id);
    });
});
