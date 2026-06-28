import dataSource from '@/database/data-source';
import { seedDemoData } from '@/database/seeding/database-seeder';

async function main(): Promise<void> {
    await dataSource.initialize();

    try {
        await seedDemoData(dataSource);
    } finally {
        await dataSource.destroy();
    }
}

main().catch((error: unknown) => {
    console.error('Failed to seed demo data.');
    console.error(error);

    process.exitCode = 1;
});
