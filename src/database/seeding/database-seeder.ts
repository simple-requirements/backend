import type { DataSource, EntityMetadata, ObjectLiteral } from 'typeorm';

import { demoCategories } from '@/database/seeding/demo-categories';
import { demoProjects } from '@/database/seeding/demo-projects';
import { Project } from '@/projects/projects.entity';
import type { RequirementType } from '@/requirements/requirement-type.enum';

type SeedCategoryEntity = ObjectLiteral & {
    id: string;
    projectId: string;
    name: string;
    key: string;
    type: RequirementType;
};

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
        await deleteDatabaseContent(transactionalEntityManager.dataSource);

        const projectsRepository = transactionalEntityManager.getRepository(Project);
        const projects = demoProjects.map((demoProject) => projectsRepository.create(demoProject));

        await projectsRepository.save(projects);

        const categoriesRepository = transactionalEntityManager.getRepository<SeedCategoryEntity>('categories');
        const categories = demoCategories.map(({ projectId, ...demoCategory }) =>
            categoriesRepository.create({ ...demoCategory, projectId }),
        );

        await categoriesRepository.save(categories);
    });
}
