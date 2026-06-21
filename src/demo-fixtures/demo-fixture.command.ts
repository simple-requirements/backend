import { AppModule } from '@/app.module';
import { DemoFixtureService } from '@/demo-fixtures/demo-fixture.service';
import { NestFactory } from '@nestjs/core';

async function main(): Promise<void> {
    const command = process.argv[2];
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
    try {
        const service = app.get(DemoFixtureService);
        const result =
            command === 'reset' ? await service.reset()
            : command === 'seed' ? await service.seed()
            : undefined;
        if (!result) throw new Error('Usage: pnpm demo:seed | REQUIREMENTS_ALLOW_DEMO_RESET=true pnpm demo:reset');
        console.log(
            `Demo fixture ${command} complete: ${result.projects} projects, ${result.requirements} requirements, ${result.metrics} metrics.`,
        );
        console.log(`Visible keys: ${result.visibleKeys.join(', ')}`);
    } finally {
        await app.close();
    }
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
