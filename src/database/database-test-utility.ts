// test/e2e/support/database.ts
import { DataSource } from 'typeorm';

let dataSource: DataSource | undefined;

export async function getE2eDataSource(): Promise<DataSource> {
    if (dataSource?.isInitialized) {
        return dataSource;
    }

    dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT ?? 5432),
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
    });

    await dataSource.initialize();

    return dataSource;
}

export async function cleanDatabase(): Promise<void> {
    const db = await getE2eDataSource();

    await db.query(`
        TRUNCATE TABLE
            requirements,
            requirement_key_counters,
            categories
        RESTART IDENTITY CASCADE;
    `);
}

export async function closeE2eDataSource(): Promise<void> {
    if (dataSource?.isInitialized) {
        await dataSource.destroy();
    }

    dataSource = undefined;
}
