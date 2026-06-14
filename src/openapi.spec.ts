import { describe, expect, it } from 'vitest';

import { createOpenApiDocument, OPENAPI_JSON_PATH, SWAGGER_UI_PATH } from '@/openapi';

/**
 * Verifies the generated OpenAPI contract without starting an HTTP server.
 */
describe('OpenAPI document', () => {
    it('generates documentation for category and requirement endpoints', () => {
        const document = createOpenApiDocument();

        expect(SWAGGER_UI_PATH).toBe('api/docs');
        expect(OPENAPI_JSON_PATH).toBe('api/docs-json');
        expect(document.info).toEqual(expect.objectContaining({ title: 'Requirements Backend API', version: '0.0.1' }));
        expect(Object.keys(document.paths)).toEqual(
            expect.arrayContaining([
                '/projects',
                '/projects/{id}',
                '/categories',
                '/categories/{id}',
                '/requirements',
                '/requirements/{id}',
                '/requirements/key/{visibleKey}',
                '/requirements/{id}/reject',
                '/requirements/{id}/approve',
                '/requirements/{id}/implemented',
                '/requirements/{id}/obsolete',
                '/requirements/{id}/revisions',
                '/requirements/{id}/revisions/{revisionNumber}',
            ]),
        );

        const requirementList = document.paths['/requirements'] as { get: { parameters: Array<{ name: string }> } };
        expect(requirementList.get.parameters.map((parameter) => parameter.name)).toEqual([
            'projectId',
            'includeRejected',
            'type',
            'categoryId',
            'status',
            'owner',
        ]);

        const createRequirement = document.components?.schemas?.CreateRequirementDto as { required: string[] };
        expect(createRequirement.required).toEqual(expect.arrayContaining(['projectId']));

        const updateRequirement = document.components?.schemas?.UpdateRequirementDto as {
            properties: Record<string, unknown>;
        };
        expect(updateRequirement.properties.projectId).toBeUndefined();

        const projectResponse = document.components?.schemas?.ProjectResponseDto as {
            properties: Record<string, unknown>;
        };
        expect(projectResponse.properties.requirementCount).toBeDefined();

        expect(document.components?.schemas?.RequirementStatus).toEqual(
            expect.objectContaining({ enum: ['draft', 'approved', 'implemented', 'obsolete', 'rejected', 'deleted'] }),
        );

        const requirementResponse = document.components?.schemas?.RequirementResponseDto as {
            required: string[];
            properties: Record<string, unknown>;
        };
        expect(requirementResponse.required).toEqual(
            expect.arrayContaining(['approvedAt', 'implementedAt', 'obsolescenceReason', 'obsoleteAt']),
        );
        expect(requirementResponse.properties.approvedAt).toEqual(
            expect.objectContaining({ format: 'date-time', nullable: true }),
        );
        expect(requirementResponse.properties.implementedAt).toEqual(
            expect.objectContaining({ format: 'date-time', nullable: true }),
        );
        expect(requirementResponse.properties.obsolescenceReason).toEqual(expect.objectContaining({ nullable: true }));
        expect(requirementResponse.properties.obsoleteAt).toEqual(
            expect.objectContaining({ format: 'date-time', nullable: true }),
        );

        expect(document.components?.schemas?.MarkObsoleteRequirementDto).toEqual(
            expect.objectContaining({ required: ['obsolescenceReason'] }),
        );
    });
});
