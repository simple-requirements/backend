import { join } from 'node:path';

import { DataSource } from 'typeorm';

import { loadDatabaseConfiguration } from '@/database/database.config';

const database = loadDatabaseConfiguration();

export default new DataSource({
    type: 'postgres',

    host: database.host,
    port: database.port,
    database: database.database,
    username: database.username,
    password: database.password,

    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],

    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],

    migrationsTableName: 'migrations',
    migrationsRun: false,
    synchronize: false,
});
