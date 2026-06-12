import { DataSource } from 'typeorm';

let dataSource: DataSource | undefined;

/**
 * Reuses a PostgreSQL connection for Playwright API tests.
 *
 * @returns Initialized data source configured from the same environment as the application.
 */
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

/**
 * Clears requirement-management tables between E2E tests.
 *
 * Truncation resets identity state while preserving the migrated schema and
 * constraints, so tests exercise the same PostgreSQL structures as the app.
 */
export async function cleanDatabase(): Promise<void> {
    const db = await getE2eDataSource();

    await db.query(`
        TRUNCATE TABLE
            categories,
            requirements,
            requirements_key_counters,
            requirements_revision
        RESTART IDENTITY CASCADE;
    `);
}

export async function closeE2eDataSource(): Promise<void> {
    if (dataSource?.isInitialized) {
        await dataSource.destroy();
    }

    dataSource = undefined;
}
