import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';

import { Category } from '@/categories/category.entity';
import type { AllocatedRequirementKeyDto } from '@/requirements/dto/allocated-requirement-key.dto';
import { RequirementKeyCounter } from '@/requirements/requirement-key-counter.entity';
import { RequirementKind } from '@/requirements/requirement-kind.enum';
import { Requirement } from '@/requirements/requirement.entity';

const MAX_REQUIREMENT_SEQUENCE_NUMBER = 9_999;
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class RequirementKeyAllocatorService {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    async allocate(kind: RequirementKind, categoryId: string): Promise<AllocatedRequirementKeyDto> {
        this.validateKind(kind);
        this.validateCategoryId(categoryId);

        try {
            return await this.dataSource.transaction(async (manager) =>
                this.allocateInTransaction(manager, kind, categoryId),
            );
        } catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new ConflictException('Requirement visible key allocation collided with an existing key');
            }

            throw error;
        }
    }

    private async allocateInTransaction(
        manager: EntityManager,
        kind: RequirementKind,
        categoryId: string,
    ): Promise<AllocatedRequirementKeyDto> {
        const category = await manager.findOne(Category, { where: { id: categoryId } });

        if (category === null) {
            throw new NotFoundException(`Category "${categoryId}" was not found`);
        }

        await manager
            .createQueryBuilder()
            .insert()
            .into(RequirementKeyCounter)
            .values({ kind, categoryId, nextNumber: 0 })
            .orIgnore()
            .execute();

        const counter = await manager.findOne(RequirementKeyCounter, {
            where: { kind, categoryId },
            lock: { mode: 'pessimistic_write' },
        });

        if (counter === null) {
            throw new ConflictException('Requirement key counter could not be initialized');
        }

        if (counter.nextNumber > MAX_REQUIREMENT_SEQUENCE_NUMBER) {
            throw new ConflictException(
                `Requirement key range exhausted for ${kind}-${category.key}; maximum sequence is ${MAX_REQUIREMENT_SEQUENCE_NUMBER}`,
            );
        }

        const sequenceNumber = counter.nextNumber;
        counter.nextNumber = sequenceNumber + 1;
        await manager.save(RequirementKeyCounter, counter);

        const requirement = manager.create(Requirement, {
            kind,
            categoryId,
            category,
            sequenceNumber,
            visibleKey: this.formatVisibleKey(kind, category.key, sequenceNumber),
        });

        const savedRequirement = await manager.save(Requirement, requirement);

        return {
            id: savedRequirement.id,
            kind: savedRequirement.kind,
            categoryId: savedRequirement.categoryId,
            sequenceNumber: savedRequirement.sequenceNumber,
            visibleKey: savedRequirement.visibleKey,
        };
    }

    private formatVisibleKey(kind: RequirementKind, categoryKey: string, sequenceNumber: number): string {
        return `${kind}-${categoryKey}-${sequenceNumber.toString().padStart(4, '0')}`;
    }

    private validateKind(kind: RequirementKind): void {
        if (!Object.values(RequirementKind).includes(kind)) {
            throw new BadRequestException('Requirement kind must be FR or NFR');
        }
    }

    private validateCategoryId(categoryId: string): void {
        if (typeof categoryId !== 'string' || categoryId.trim() === '') {
            throw new BadRequestException('Category id is required');
        }
    }

    private isUniqueViolation(error: unknown): boolean {
        return (
            error instanceof QueryFailedError
            && typeof error.driverError === 'object'
            && error.driverError !== null
            && 'code' in error.driverError
            && (error.driverError as Record<string, unknown>).code === POSTGRES_UNIQUE_VIOLATION_CODE
        );
    }
}
