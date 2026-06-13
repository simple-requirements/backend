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
        .setDescription('HTTP API for category management and requirement lifecycle operations.')
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
                                pattern: '^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$',
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
                        key: { type: 'string', pattern: '^[A-Z][A-Z0-9_]*$', example: 'PERF' },
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
                    required: ['categoryId', 'description', 'priority'],
                    properties: {
                        categoryId: { type: 'string', format: 'uuid' },
                        description: { type: 'string' },
                        priority: { type: 'string', example: 'p3' },
                        owner: { type: 'string', nullable: true },
                        rationale: { type: 'string', nullable: true },
                        source: { type: 'string', nullable: true },
                    },
                },
                UpdateRequirementDto: {
                    type: 'object',
                    properties: {
                        description: { type: 'string' },
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
                RequirementResponseDto: {
                    type: 'object',
                    required: [
                        'id',
                        'visibleKey',
                        'type',
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
                        categoryId: { type: 'string', format: 'uuid' },
                        sequenceNumber: { type: 'integer', minimum: 1, maximum: 9999 },
                        status: { $ref: '#/components/schemas/RequirementStatus' },
                        description: { type: 'string' },
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
