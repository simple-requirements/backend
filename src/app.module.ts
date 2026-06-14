import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { CategoriesModule } from '@/categories/categories.module';
import { ProjectsModule } from '@/projects/projects.module';
import { RequirementsModule } from '@/requirements/requirements.module';
import databaseConfig from '@/database/database.config';

/**
 * Root NestJS module that composes configuration, database access, and domain modules.
 *
 * The module configures TypeORM with migrations-managed PostgreSQL schema and never enables synchronize, preserving migration ownership of production structure.
 */
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),

        TypeOrmModule.forRootAsync({
            inject: [databaseConfig.KEY],

            useFactory: (database: ConfigType<typeof databaseConfig>): TypeOrmModuleOptions => ({
                type: 'postgres',

                host: database.host,
                port: database.port,
                database: database.database,
                username: database.username,
                password: database.password,

                autoLoadEntities: true,

                synchronize: false,
                migrationsRun: false,

                retryAttempts: 10,
                retryDelay: 3_000,

                logging: false,
            }),
        }),

        CategoriesModule,
        ProjectsModule,
        RequirementsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
