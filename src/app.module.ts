import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import databaseConfig from '@/database/database.config';
import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';

import { ProjectsModule } from '@/projects/projects.module';
import { RequirementReviewsModule } from '@/requirement-reviews/requirement-reviews.module';

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

                // Schema changes are managed through migrations.
                synchronize: false,
                migrationsRun: false,

                retryAttempts: 10,
                retryDelay: 3_000,

                logging: false,
            }),
        }),
        ProjectsModule,
        RequirementReviewsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
