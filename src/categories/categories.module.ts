import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Category } from '@/categories/categories.entity';
import { CategoriesController } from '@/categories/categories.controller';
import { CategoriesService } from '@/categories/categories.service';
import { Project } from '@/projects/projects.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Category, Project])],
    controllers: [CategoriesController],
    providers: [CategoriesService],
    exports: [CategoriesService],
})
export class CategoriesModule {}
