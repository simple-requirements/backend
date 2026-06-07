import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './database/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),

    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],

      useFactory: (
        database: ConfigType<typeof databaseConfig>,
      ): TypeOrmModuleOptions => ({
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
