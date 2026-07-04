import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoriesController } from '@/projects/categories.controller';
import { Category } from '@/projects/categories.entity';
import { Project } from '@/projects/projects.entity';
import { ProjectsController } from '@/projects/projects.controller';
import { ProjectsService } from '@/projects/projects.service';
import { RequirementRevision } from '@/projects/requirement-revisions.entity';
import { RequirementsController } from '@/projects/requirements.controller';
import { Requirement } from '@/projects/requirements.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Project, Category, Requirement, RequirementRevision])],
    controllers: [ProjectsController, CategoriesController, RequirementsController],
    providers: [ProjectsService],
    exports: [ProjectsService],
})
export class ProjectsModule {}
