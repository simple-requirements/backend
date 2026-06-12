import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Category } from '@/categories/category.entity';
import { RequirementKeyAllocatorService } from '@/requirements/requirement-key-allocator.service';
import { RequirementKeyCounter } from '@/requirements/requirement-key-counter.entity';
import { Requirement } from '@/requirements/requirement.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Category, Requirement, RequirementKeyCounter])],
    providers: [RequirementKeyAllocatorService],
    exports: [RequirementKeyAllocatorService],
})
export class RequirementsModule {}
