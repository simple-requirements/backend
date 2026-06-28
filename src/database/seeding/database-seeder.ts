import type { DataSource, EntityMetadata } from 'typeorm';

import { demoProjects } from '@/database/seeding/demo-projects';
import { Project } from '@/projects/projects.entity';

function quotePostgresIdentifier(identifier: string): string {
    return `"${identifier.replaceAll('"', '""')}"`;
}

function getTableName(metadata: EntityMetadata): string {
    const tableName = quotePostgresIdentifier(metadata.tableName);

    if (metadata.schema === undefined || metadata.schema.trim() === '') {
        return tableName;
    }

    return `${quotePostgresIdentifier(metadata.schema)}.${tableName}`;
}

async function deleteDatabaseContent(dataSource: DataSource): Promise<void> {
    const tableNames = dataSource.entityMetadatas.map(getTableName);

    if (tableNames.length === 0) {
        return;
    }

    await dataSource.query(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`);
}

export async function seedDemoData(dataSource: DataSource): Promise<void> {
    await dataSource.transaction(async (transactionalEntityManager) => {
        await deleteDatabaseContent(transactionalEntityManager.connection);

        const projectsRepository = transactionalEntityManager.getRepository(Project);
        const projects = demoProjects.map((demoProject) => projectsRepository.create(demoProject));

        await projectsRepository.save(projects);
    });
}
