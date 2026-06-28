import { NestFactory } from '@nestjs/core';

import { AppModule } from '@/app.module';

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function parseCorsOrigins(): string[] {
    const configuredOrigins = process.env.CORS_ORIGIN?.split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);

    return configuredOrigins && configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_CORS_ORIGINS;
}

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: parseCorsOrigins(),
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Accept', 'Authorization', 'Content-Type'],
        optionsSuccessStatus: 204,
    });

    const port = Number(process.env.PORT ?? 3000);

    await app.listen(port, '0.0.0.0');
}

void bootstrap();

void bootstrap();
