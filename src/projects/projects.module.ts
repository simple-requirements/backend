import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Project } from '@/projects/projects.entity';
import { ProjectsController } from '@/projects/projects.controller';
import { ProjectsService } from '@/projects/projects.service';

@Module({
    imports: [TypeOrmModule.forFeature([Project])],
    controllers: [ProjectsController],
    providers: [ProjectsService],
    exports: [ProjectsService],
})
export class ProjectsModule {}
