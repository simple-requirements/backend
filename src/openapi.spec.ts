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
                '/categories',
                '/categories/{id}',
                '/requirements',
                '/requirements/{id}',
                '/requirements/key/{visibleKey}',
                '/requirements/{id}/reject',
                '/requirements/{id}/revisions',
                '/requirements/{id}/revisions/{revisionNumber}',
            ]),
        );

        const requirementList = document.paths['/requirements'] as { get: { parameters: Array<{ name: string }> } };
        expect(requirementList.get.parameters.map((parameter) => parameter.name)).toEqual([
            'includeRejected',
            'type',
            'categoryId',
            'status',
            'owner',
        ]);
    });
});
