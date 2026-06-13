import { expect, test } from '@playwright/test';

import { cleanDatabase, closeE2eDataSource, getE2eDataSource } from '@/database/database-test-utility';

/**
 * Extracts a string column from raw database rows returned by TypeORM.
 *
 * @param rows - Unknown query result from the PostgreSQL driver.
 * @param column - Column name to read from every row.
 * @returns String column values or an empty array when the result shape is unexpected.
 */
function stringColumn(rows: unknown, column: string): string[] {
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows.flatMap((row) => {
        if (typeof row !== 'object' || row === null || !(column in row)) {
            return [];
        }

        const value = (row as Record<string, unknown>)[column];
        return typeof value === 'string' ? [value] : [];
    });
}

/**
 * Migration smoke tests against PostgreSQL-backed schema used by the E2E app.
 */
test.describe('PostgreSQL migrations', () => {
    test.afterAll(async () => {
        await closeE2eDataSource();
    });

    test('create expected requirement-management schema objects and constraints', async ({ request }) => {
        await cleanDatabase();
        const db = await getE2eDataSource();

        const tableRows = (await db.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('categories', 'requirements', 'requirements_key_counters', 'requirements_revision') ORDER BY table_name`,
        )) as unknown;
        expect(stringColumn(tableRows, 'table_name')).toEqual([
            'categories',
            'requirements',
            'requirements_key_counters',
            'requirements_revision',
        ]);

        const constraintRows = (await db.query(
            `SELECT conname FROM pg_constraint WHERE conname IN ('UQ_categories_key', 'UQ_requirements_visible_key', 'UQ_requirements_category_sequence', 'UQ_requirements_key_counters_category', 'CHK_categories_type', 'CHK_requirements_status') ORDER BY conname`,
        )) as unknown;
        expect(stringColumn(constraintRows, 'conname')).toEqual(
            expect.arrayContaining([
                'UQ_categories_key',
                'UQ_requirements_visible_key',
                'UQ_requirements_category_sequence',
                'UQ_requirements_key_counters_category',
                'CHK_categories_type',
                'CHK_requirements_status',
            ]),
        );

        const health = await request.get('/');
        expect(health.status()).toBe(200);
    });
});
