import { Category } from '@/categories/category.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsKeyAllocatorService } from '@/requirements/requirements-key-allocator.service';
import { RequirementsKeyCounter } from '@/requirements/requirements-key-counter.entity';
import { RequirementsController } from '@/requirements/requirements.controller';
import { RequirementRevision } from '@/requirements/requirements-revision.entity';
import { Requirement } from '@/requirements/requirements.entity';
import { RequirementsService } from '@/requirements/requirements.service';

@Module({
    imports: [TypeOrmModule.forFeature([Category, Requirement, RequirementRevision, RequirementsKeyCounter])],
    controllers: [RequirementsController],
    providers: [RequirementsKeyAllocatorService, RequirementsService],
    exports: [RequirementsKeyAllocatorService, RequirementsService],
})
export class RequirementsModule {}
