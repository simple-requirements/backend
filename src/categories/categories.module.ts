import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoriesController } from '@/categories/categories.controller';
import { CategoriesService } from '@/categories/categories.service';
import { Category } from '@/categories/category.entity';

/**
 * NestJS feature module for category HTTP and persistence components.
 *
 * This module registers the Category repository and exports the service for requirement workflows that validate category references.
 */
@Module({
    imports: [TypeOrmModule.forFeature([Category])],
    controllers: [CategoriesController],
    providers: [CategoriesService],
    exports: [CategoriesService],
})
export class CategoriesModule {}
