import { NestFactory } from '@nestjs/core';

import { AppModule } from '@/app.module';
import { setupOpenApi } from '@/openapi';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    setupOpenApi(app);

    const port = Number(process.env.PORT ?? 3000);

    await app.listen(port, '0.0.0.0');
}

void bootstrap();
