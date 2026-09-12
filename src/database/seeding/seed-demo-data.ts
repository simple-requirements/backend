import dataSource from '@/database/data-source';
import { seedDemoData } from '@/database/seeding/database-seeder';
import { seedE2eAuthenticationData } from '@/database/seeding/seed-e2e-authentication-data';

async function main(): Promise<void> {
    try {
        if (!dataSource.isInitialized) {
            await dataSource.initialize();
        }

        await seedDemoData(dataSource);

        if (process.env.E2E_SEED_AUTHENTICATION !== 'false') {
            await seedE2eAuthenticationData(dataSource);
        }
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}

main().catch((error: unknown) => {
    console.error('Failed to seed demo data.');
    console.error(error);

    process.exitCode = 1;
});
