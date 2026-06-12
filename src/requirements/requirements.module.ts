import { Category } from '@/categories/category.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsKeyCounter } from './requirements-key-counter.entity';
import { Requirement } from './requirements.entity';
import { RequirementsKeyAllocatorService } from './requirements-key-allocator.service';

@Module({
    imports: [TypeOrmModule.forFeature([Category, Requirement, RequirementsKeyCounter])],
    providers: [RequirementsKeyAllocatorService],
    exports: [RequirementsKeyAllocatorService],
})
export class RequirementsModule {}
