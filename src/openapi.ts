import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export const SWAGGER_UI_PATH = 'api/docs';

export const OPENAPI_JSON_PATH = 'api/docs-json';

function createOpenApiConfig() {
    return new DocumentBuilder()
        .setTitle('Requirements Backend API')
        .setDescription('HTTP API for the Requirements Management app.')
        .setVersion('0.0.1')
        .build();
}

export function setupOpenApi(app: INestApplication): OpenAPIObject {
    const document = SwaggerModule.createDocument(app, createOpenApiConfig());

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
