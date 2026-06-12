import { registerAs } from '@nestjs/config';

export interface DatabaseConfiguration {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
}

function getRequiredEnvironmentVariable(name: string): string {
    const value = process.env[name];

    if (value === undefined || value.trim() === '') {
        throw new Error(`Required environment variable "${name}" is not defined`);
    }

    return value;
}

function getDatabasePort(): number {
    const value = getRequiredEnvironmentVariable('DATABASE_PORT');
    const port = Number(value);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`DATABASE_PORT must be a valid TCP port, but received "${value}"`);
    }

    return port;
}

/**
 * Loads database settings shared by Nest startup and TypeORM CLI commands.
 *
 * Failing fast on missing values prevents the application from silently using a
 * different database for migrations, tests, or production startup.
 *
 * @returns Validated PostgreSQL connection settings.
 */
export function loadDatabaseConfiguration(): DatabaseConfiguration {
    return {
        host: getRequiredEnvironmentVariable('DATABASE_HOST'),
        port: getDatabasePort(),
        database: getRequiredEnvironmentVariable('DATABASE_NAME'),
        username: getRequiredEnvironmentVariable('DATABASE_USER'),
        password: getRequiredEnvironmentVariable('DATABASE_PASSWORD'),
    };
}

export default registerAs('database', loadDatabaseConfiguration);
