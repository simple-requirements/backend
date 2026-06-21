import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export const SWAGGER_UI_PATH = 'api/docs';

export const OPENAPI_JSON_PATH = 'api/docs-json';

/**
 * Creates the OpenAPI document for the requirement-management API.
 *
 * The document is intentionally assembled from the implemented controllers and
 * DTO contracts so the documentation route can be tested without starting a
 * second application or requiring database access.
 *
 * @returns OpenAPI document describing the currently implemented HTTP API.
 */
export function createOpenApiDocument(): OpenAPIObject {
    const config = new DocumentBuilder()
        .setTitle('Requirements Backend API')
        .setDescription('HTTP API for the Requirements Management app.')
        .setVersion('0.0.1')
        .build();

    return {
        ...config,
        paths: {
            '/': {
                get: {
                    tags: ['health'],
                    summary: 'Retrieve the application greeting.',
                    responses: { '200': { description: 'Application greeting.' } },
                },
            },
            '/categories': {
                post: {
                    tags: ['categories'],
                    summary: 'Create a category.',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCategoryDto' } } },
                    },
                    responses: {
                        '201': {
                            description: 'Category created.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/CategoryResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
                get: {
                    tags: ['categories'],
                    summary: 'List categories ordered by key.',
                    responses: {
                        '200': {
                            description: 'Categories.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/CategoryResponseDto' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/categories/{id}': {
                get: {
                    tags: ['categories'],
                    summary: 'Retrieve a category by UUID.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Category.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/CategoryResponseDto' } },
                            },
                        },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/projects': {
                post: {
                    tags: ['projects'],
                    summary: 'Create a project.',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProjectDto' } } },
                    },
                    responses: {
                        '201': {
                            description: 'Project created.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/ProjectResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                    },
                },
                get: {
                    tags: ['projects'],
                    summary: 'List projects with non-deleted requirement counts.',
                    responses: {
                        '200': {
                            description: 'Projects.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/ProjectResponseDto' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/projects/{id}': {
                get: {
                    tags: ['projects'],
                    summary: 'Retrieve a project by UUID.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Project.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/ProjectResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },

            '/requirements/{id}/links': {
                post: {
                    tags: ['requirement-links'],
                    summary:
                        'Create an explicit fixed-type references link from a source requirement to a target requirement.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': { schema: { $ref: '#/components/schemas/RequirementLinkTargetDto' } },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'Requirement link created.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
            },

            '/requirements/{id}/link-history': {
                get: {
                    tags: ['requirement-links'],
                    summary: 'List auditable requirement link lifecycle events involving a requirement.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Requirement link history ordered by occurrence time and id.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/RequirementLinkHistoryResponseDto' },
                                    },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/requirements/{id}/revisions/{revisionNumber}/links': {
                get: {
                    tags: ['requirement-links'],
                    summary: 'List incoming and outgoing links active at a requirement revision timestamp.',
                    description:
                        'Historical reconstruction treats created events at the exact revision timestamp as active (inclusive) and deleted events at the exact timestamp as inactive for later states.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                        { name: 'revisionNumber', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
                    ],
                    responses: {
                        '200': {
                            description: 'Revision-aware link state.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/RequirementRevisionLinksResponseDto' },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/requirements/{id}/link-changes': {
                get: {
                    tags: ['requirement-links'],
                    summary: 'Compare requirement link state between two requirement revisions.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                        { name: 'fromRevision', in: 'query', required: true, schema: { type: 'integer', minimum: 1 } },
                        { name: 'toRevision', in: 'query', required: true, schema: { type: 'integer', minimum: 1 } },
                    ],
                    responses: {
                        '200': {
                            description: 'Added, removed, and unchanged incoming/outgoing links.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/RequirementLinkChangesResponseDto' },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/requirements/{id}/links/outgoing': {
                get: {
                    tags: ['requirement-links'],
                    summary: 'List active outgoing requirement links.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Active outgoing links.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                                    },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/requirements/{id}/links/incoming': {
                get: {
                    tags: ['requirement-links'],
                    summary: 'List active incoming requirement links.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Active incoming links.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                                    },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/projects/{projectId}/requirement-links': {
                get: {
                    tags: ['requirement-links'],
                    summary: 'List active requirement links for a project.',
                    parameters: [
                        { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Project requirement links.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                                    },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/requirement-links/{linkId}': {
                patch: {
                    tags: ['requirement-links'],
                    summary: 'Correct an active requirement link target.',
                    parameters: [
                        { name: 'linkId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': { schema: { $ref: '#/components/schemas/RequirementLinkTargetDto' } },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Requirement link updated.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
                delete: {
                    tags: ['requirement-links'],
                    summary: 'Soft-remove an active requirement link.',
                    parameters: [
                        { name: 'linkId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '204': { description: 'Requirement link removed.' },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },

            '/metrics': {
                post: {
                    tags: ['metrics'],
                    summary: 'Create a project-scoped metric.',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMetricDto' } } },
                    },
                    responses: {
                        '201': {
                            description: 'Metric created.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/MetricResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
                get: {
                    tags: ['metrics'],
                    summary: 'List metrics by project.',
                    parameters: [
                        { name: 'projectId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Metrics.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/MetricResponseDto' },
                                    },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/metrics/key/{key}': {
                get: {
                    tags: ['metrics'],
                    summary: 'Retrieve a metric by key within a project.',
                    parameters: [
                        {
                            name: 'key',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', pattern: '^MET-[0-9]{4}$', example: 'MET-0001' },
                        },
                        { name: 'projectId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Metric.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/MetricResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/metrics/{id}': {
                get: {
                    tags: ['metrics'],
                    summary: 'Retrieve a metric by UUID.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Metric.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/MetricResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/requirements': {
                post: {
                    tags: ['requirements'],
                    summary: 'Create a draft requirement and allocate its visible key.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': { schema: { $ref: '#/components/schemas/CreateRequirementDto' } },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'Requirement created.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/RequirementResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
                get: {
                    tags: ['requirements'],
                    summary: 'List requirements with optional filters.',
                    parameters: [
                        { name: 'projectId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
                        { name: 'includeRejected', in: 'query', required: false, schema: { type: 'boolean' } },
                        {
                            name: 'type',
                            in: 'query',
                            required: false,
                            schema: { $ref: '#/components/schemas/RequirementType' },
                        },
                        {
                            name: 'categoryId',
                            in: 'query',
                            required: false,
                            schema: { type: 'string', format: 'uuid' },
                        },
                        {
                            name: 'status',
                            in: 'query',
                            required: false,
                            schema: { $ref: '#/components/schemas/RequirementStatus' },
                        },
                        { name: 'owner', in: 'query', required: false, schema: { type: 'string' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Requirements.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/RequirementResponseDto' },
                                    },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                    },
                },
            },
            '/requirements/key/{visibleKey}': {
                get: {
                    tags: ['requirements'],
                    summary: 'Retrieve a requirement by visible key.',
                    parameters: [
                        {
                            name: 'visibleKey',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'string',
                                pattern: '^(FR|NFR)-[A-Z]{2,4}-[0-9]{4}$',
                                example: 'NFR-PERF-0001',
                            },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Requirement.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/RequirementResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/requirements/{id}': {
                get: {
                    tags: ['requirements'],
                    summary: 'Retrieve a requirement by UUID.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Requirement.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/RequirementResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
                patch: {
                    tags: ['requirements'],
                    summary: 'Edit editable fields of a draft requirement.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': { schema: { $ref: '#/components/schemas/UpdateRequirementDto' } },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Requirement updated.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/RequirementResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
                delete: {
                    tags: ['requirements'],
                    summary: 'Soft-delete a draft requirement.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '204': { description: 'Requirement deleted.' },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
            },
            '/requirements/{id}/reject': {
                patch: {
                    tags: ['requirements'],
                    summary: 'Reject a draft requirement.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': { schema: { $ref: '#/components/schemas/RejectRequirementDto' } },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Requirement rejected.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/RequirementResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
            },
            '/requirements/{id}/approve': {
                patch: {
                    tags: ['requirements'],
                    summary: 'Approve a draft requirement.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Requirement approved.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/RequirementResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
            },
            '/requirements/{id}/implemented': {
                patch: {
                    tags: ['requirements'],
                    summary: 'Mark an approved requirement implemented.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Requirement implemented.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/RequirementResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
            },
            '/requirements/{id}/obsolete': {
                patch: {
                    tags: ['requirements'],
                    summary: 'Mark an approved or rejected requirement obsolete.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': { schema: { $ref: '#/components/schemas/MarkObsoleteRequirementDto' } },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Requirement obsolete.',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/RequirementResponseDto' } },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '409': { $ref: '#/components/responses/Conflict' },
                    },
                },
            },
            '/requirements/{id}/revisions': {
                get: {
                    tags: ['requirements'],
                    summary: 'List immutable revision snapshots for a requirement.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        '200': {
                            description: 'Requirement revisions.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/RequirementRevisionResponseDto' },
                                    },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/requirements/{id}/revisions/{revisionNumber}': {
                get: {
                    tags: ['requirements'],
                    summary: 'Retrieve one immutable revision snapshot.',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                        { name: 'revisionNumber', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
                    ],
                    responses: {
                        '200': {
                            description: 'Requirement revision.',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/RequirementRevisionResponseDto' },
                                },
                            },
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
        },
        components: {
            schemas: {
                CreateMetricDto: {
                    type: 'object',
                    required: ['projectId', 'key', 'value'],
                    properties: {
                        projectId: { type: 'string', format: 'uuid' },
                        key: { type: 'string', pattern: '^MET-[0-9]{4}$', example: 'MET-0001' },
                        value: { type: 'string', minLength: 1, example: '2000 ms' },
                        description: { type: 'string', nullable: true, example: 'Max. latency' },
                    },
                },
                MetricResponseDto: {
                    type: 'object',
                    required: ['id', 'projectId', 'key', 'value', 'description', 'createdAt', 'updatedAt'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        projectId: { type: 'string', format: 'uuid' },
                        key: { type: 'string', pattern: '^MET-[0-9]{4}$', example: 'MET-0001' },
                        value: { type: 'string', example: '2000 ms' },
                        description: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                MetricReferenceResponseDto: {
                    type: 'object',
                    required: ['id', 'key', 'value', 'description', 'resolved'],
                    properties: {
                        id: { type: 'string', format: 'uuid', nullable: true },
                        key: { type: 'string', pattern: '^MET-[0-9]{4}$', example: 'MET-0001' },
                        value: { type: 'string', nullable: true },
                        description: { type: 'string', nullable: true },
                        resolved: {
                            type: 'boolean',
                            description: 'Whether the reference resolved within the requirement project.',
                        },
                    },
                },
                RequirementType: {
                    type: 'string',
                    enum: ['FR', 'NFR'],
                    description: 'Requirement type. For requirements, this is derived from the assigned category.',
                },
                RequirementStatus: {
                    type: 'string',
                    enum: ['draft', 'approved', 'implemented', 'obsolete', 'rejected', 'deleted'],
                    description: 'Implemented requirement lifecycle state.',
                },
                CreateCategoryDto: {
                    type: 'object',
                    required: ['name', 'key', 'type'],
                    properties: {
                        name: { type: 'string', example: 'Performance' },
                        key: { type: 'string', pattern: '^[A-Z]{2,4}$', example: 'PERF' },
                        type: { $ref: '#/components/schemas/RequirementType' },
                    },
                },
                CategoryResponseDto: {
                    type: 'object',
                    required: ['id', 'name', 'key', 'type', 'createdAt', 'updatedAt'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        key: { type: 'string', example: 'PERF' },
                        type: { $ref: '#/components/schemas/RequirementType' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                CreateRequirementDto: {
                    type: 'object',
                    required: ['projectId', 'categoryId', 'description', 'priority'],
                    properties: {
                        projectId: { type: 'string', format: 'uuid' },
                        categoryId: { type: 'string', format: 'uuid' },
                        description: {
                            type: 'string',
                            description:
                                'Canonical code/source text. Metric references use [~MET-0001]; inline definition syntax such as [~MET-0001 := 2000 ms] is unsupported and rejected.',
                        },
                        priority: { type: 'string', example: 'p3' },
                        owner: { type: 'string', nullable: true },
                        rationale: { type: 'string', nullable: true },
                        source: { type: 'string', nullable: true },
                    },
                },
                CreateProjectDto: {
                    type: 'object',
                    required: ['name'],
                    properties: { name: { type: 'string', example: 'Platform Modernization' } },
                },
                ProjectResponseDto: {
                    type: 'object',
                    required: ['id', 'name', 'requirementCount', 'createdAt', 'updatedAt'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        requirementCount: { type: 'integer', minimum: 0 },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                UpdateRequirementDto: {
                    type: 'object',
                    properties: {
                        description: {
                            type: 'string',
                            description:
                                'Canonical code/source text. Metric references use [~MET-0001]; inline metric definitions are unsupported and are not used to create or update metrics.',
                        },
                        priority: { type: 'string' },
                        owner: { type: 'string', nullable: true },
                        rationale: { type: 'string', nullable: true },
                        source: { type: 'string', nullable: true },
                    },
                },
                RejectRequirementDto: {
                    type: 'object',
                    required: ['rejectionReason', 'reviewer'],
                    properties: {
                        rejectionReason: { type: 'string' },
                        reviewer: { type: 'string', example: 'QA Lead' },
                    },
                },
                MarkObsoleteRequirementDto: {
                    type: 'object',
                    required: ['obsolescenceReason'],
                    properties: { obsolescenceReason: { type: 'string', example: 'Superseded by NFR-PERF-0002.' } },
                },
                RequirementLinkTargetDto: {
                    type: 'object',
                    properties: {
                        targetRequirementId: { type: 'string', format: 'uuid' },
                        targetVisibleKey: { type: 'string', example: 'NFR-PERF-0001' },
                    },
                    description:
                        'Provide exactly one of targetRequirementId or targetVisibleKey. Relationship type is fixed to references; self-links, duplicate active links, and cross-project links are rejected.',
                },
                RequirementLinkResponseDto: {
                    type: 'object',
                    required: [
                        'id',
                        'projectId',
                        'relationshipType',
                        'sourceRequirementId',
                        'sourceVisibleKey',
                        'sourceType',
                        'sourceCategoryId',
                        'sourceStatus',
                        'targetRequirementId',
                        'targetVisibleKey',
                        'targetType',
                        'targetCategoryId',
                        'targetStatus',
                        'createdAt',
                        'updatedAt',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        projectId: { type: 'string', format: 'uuid' },
                        relationshipType: { type: 'string', enum: ['references'] },
                        sourceRequirementId: { type: 'string', format: 'uuid' },
                        sourceVisibleKey: { type: 'string' },
                        sourceType: { $ref: '#/components/schemas/RequirementType' },
                        sourceCategoryId: { type: 'string', format: 'uuid' },
                        sourceCategoryKey: { type: 'string' },
                        sourceStatus: { $ref: '#/components/schemas/RequirementStatus' },
                        targetRequirementId: { type: 'string', format: 'uuid' },
                        targetVisibleKey: { type: 'string' },
                        targetType: { $ref: '#/components/schemas/RequirementType' },
                        targetCategoryId: { type: 'string', format: 'uuid' },
                        targetCategoryKey: { type: 'string' },
                        targetStatus: { $ref: '#/components/schemas/RequirementStatus' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },

                RequirementLinkHistoryResponseDto: {
                    type: 'object',
                    required: [
                        'id',
                        'linkId',
                        'projectId',
                        'eventType',
                        'relationshipType',
                        'sourceRequirementId',
                        'sourceVisibleKey',
                        'oldTargetRequirementId',
                        'oldTargetVisibleKey',
                        'newTargetRequirementId',
                        'newTargetVisibleKey',
                        'occurredAt',
                        'actor',
                        'reason',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        linkId: { type: 'string', format: 'uuid' },
                        projectId: { type: 'string', format: 'uuid' },
                        eventType: { type: 'string', enum: ['created', 'target_changed', 'deleted'] },
                        relationshipType: { type: 'string', enum: ['references'] },
                        sourceRequirementId: { type: 'string', format: 'uuid' },
                        sourceVisibleKey: { type: 'string' },
                        oldTargetRequirementId: { type: 'string', format: 'uuid', nullable: true },
                        oldTargetVisibleKey: { type: 'string', nullable: true },
                        newTargetRequirementId: { type: 'string', format: 'uuid', nullable: true },
                        newTargetVisibleKey: { type: 'string', nullable: true },
                        occurredAt: { type: 'string', format: 'date-time' },
                        actor: { type: 'string', nullable: true },
                        reason: { type: 'string', nullable: true },
                    },
                },
                RequirementRevisionLinksResponseDto: {
                    type: 'object',
                    required: [
                        'requirementId',
                        'revisionNumber',
                        'revisionCreatedAt',
                        'outgoingLinks',
                        'incomingLinks',
                    ],
                    properties: {
                        requirementId: { type: 'string', format: 'uuid' },
                        revisionNumber: { type: 'integer', minimum: 1 },
                        revisionCreatedAt: { type: 'string', format: 'date-time' },
                        outgoingLinks: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                        },
                        incomingLinks: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                        },
                    },
                },
                RequirementLinkChangesResponseDto: {
                    type: 'object',
                    required: [
                        'requirementId',
                        'fromRevision',
                        'toRevision',
                        'addedOutgoingLinks',
                        'removedOutgoingLinks',
                        'unchangedOutgoingLinks',
                        'addedIncomingLinks',
                        'removedIncomingLinks',
                        'unchangedIncomingLinks',
                    ],
                    properties: {
                        requirementId: { type: 'string', format: 'uuid' },
                        fromRevision: { type: 'integer', minimum: 1 },
                        toRevision: { type: 'integer', minimum: 1 },
                        addedOutgoingLinks: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                        },
                        removedOutgoingLinks: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                        },
                        unchangedOutgoingLinks: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                        },
                        addedIncomingLinks: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                        },
                        removedIncomingLinks: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                        },
                        unchangedIncomingLinks: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/RequirementLinkResponseDto' },
                        },
                    },
                },
                RequirementResponseDto: {
                    type: 'object',
                    required: [
                        'id',
                        'visibleKey',
                        'type',
                        'projectId',
                        'categoryId',
                        'sequenceNumber',
                        'status',
                        'description',
                        'priority',
                        'owner',
                        'rationale',
                        'source',
                        'rejectionReason',
                        'reviewer',
                        'rejectedAt',
                        'deletedAt',
                        'approvedAt',
                        'implementedAt',
                        'obsolescenceReason',
                        'obsoleteAt',
                        'createdAt',
                        'updatedAt',
                        'renderedDescription',
                        'metricReferences',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        visibleKey: {
                            type: 'string',
                            example: 'NFR-PERF-0001',
                            description: 'Prefix is derived from the assigned category type.',
                        },
                        type: {
                            allOf: [{ $ref: '#/components/schemas/RequirementType' }],
                            readOnly: true,
                            description: 'Derived from the assigned category.',
                        },
                        projectId: { type: 'string', format: 'uuid' },
                        categoryId: { type: 'string', format: 'uuid' },
                        sequenceNumber: { type: 'integer', minimum: 1, maximum: 9999 },
                        status: { $ref: '#/components/schemas/RequirementStatus' },
                        description: { type: 'string', description: 'Canonical code/source text for code mode.' },
                        renderedDescription: {
                            type: 'string',
                            description: 'Display text with resolved metric references substituted for visual mode.',
                        },
                        metricReferences: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/MetricReferenceResponseDto' },
                        },
                        priority: { type: 'string' },
                        owner: { type: 'string', nullable: true },
                        rationale: { type: 'string', nullable: true },
                        source: { type: 'string', nullable: true },
                        rejectionReason: { type: 'string', nullable: true },
                        reviewer: { type: 'string', nullable: true },
                        rejectedAt: { type: 'string', format: 'date-time', nullable: true },
                        deletedAt: { type: 'string', format: 'date-time', nullable: true },
                        approvedAt: { type: 'string', format: 'date-time', nullable: true },
                        implementedAt: { type: 'string', format: 'date-time', nullable: true },
                        obsolescenceReason: { type: 'string', nullable: true },
                        obsoleteAt: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                RequirementRevisionResponseDto: {
                    allOf: [
                        { $ref: '#/components/schemas/RequirementResponseDto' },
                        {
                            type: 'object',
                            required: [
                                'requirementId',
                                'revisionNumber',
                                'requirementCreatedAt',
                                'requirementUpdatedAt',
                            ],
                            properties: {
                                requirementId: { type: 'string', format: 'uuid' },
                                revisionNumber: { type: 'integer', minimum: 1 },
                                requirementCreatedAt: { type: 'string', format: 'date-time' },
                                requirementUpdatedAt: { type: 'string', format: 'date-time' },
                            },
                        },
                    ],
                },
                ErrorResponse: {
                    type: 'object',
                    required: ['statusCode', 'message', 'error'],
                    properties: {
                        statusCode: { type: 'integer' },
                        message: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
                        error: { type: 'string' },
                    },
                },
            },
            responses: {
                BadRequest: {
                    description: 'Malformed request input.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
                NotFound: {
                    description: 'Requested resource was not found.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
                Conflict: {
                    description: 'Duplicate or conflicting operation.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
            },
        },
    };
}

/**
 * Registers Swagger UI and JSON routes on an already-created Nest application.
 *
 * @param app - Nest application that will serve the documentation endpoints.
 * @returns The generated OpenAPI document registered on the application.
 */
export function setupOpenApi(app: INestApplication): OpenAPIObject {
    const document = createOpenApiDocument();
    SwaggerModule.setup(SWAGGER_UI_PATH, app, document);

    const httpServer = app.getHttpAdapter().getInstance() as {
        get: (
            path: string,
            handler: (_request: unknown, response: { json: (body: OpenAPIObject) => void }) => void,
        ) => void;
    };

    httpServer.get(`/${OPENAPI_JSON_PATH}`, (_request, response) => {
        response.json(document);
    });
    return document;
}
