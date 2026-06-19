import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';

import { Category } from '@/categories/category.entity';
import type { AllocatedRequirementKeyDto } from '@/requirements/dto/allocated-requirement-key.dto';
import { RequirementType } from '@/requirements/requirement-type-enum';
import { CATEGORY_KEY_PATTERN, MAX_REQUIREMENT_SEQUENCE_NUMBER } from '@/requirements/requirement-key-patterns';
import { RequirementsKeyCounter } from '@/requirements/requirements-key-counter.entity';
import { Requirement } from '@/requirements/requirements.entity';

const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Allocates durable visible keys for requirements.
 *
 * A requirement key is reserved by inserting the requirement row in the same
 * transaction that advances the per-category counter. Once consumed,
 * a sequence number is not reused by later lifecycle transitions because the
 * counter is only incremented and never derived from existing requirements.
 */
@Injectable()
export class RequirementsKeyAllocatorService {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    /**
     * Reserves the next visible key for a category.
     *
     * The underlying counter row is created on first use and locked with a
     * pessimistic write lock before its value is consumed. This makes concurrent
     * PostgreSQL transactions serialize allocation for the same category while allowing other category counters to progress independently.
     *
     * @param categoryId - Category UUID whose key forms the middle segment.
     * @returns The persisted requirement identity and reserved visible key.
     * @throws BadRequestException If the category ID or category key is invalid.
     * @throws NotFoundException If the category does not exist.
     * @throws ConflictException If the sequence range is exhausted or a database uniqueness constraint is hit.
     */
    async allocate(categoryId: string, projectId: string): Promise<AllocatedRequirementKeyDto> {
        return this.runWithAllocationConflictMapping(() =>
            this.dataSource.transaction(async (manager) => this.allocateInTransaction(manager, categoryId, projectId)),
        );
    }

    /**
     * Performs key reservation with the caller-provided transaction manager.
     *
     * The saved requirement row contains only durable identity/classification fields;
     * RequirementsService populates editable draft fields in the same creation
     * transaction.
     *
     * @param manager - Transactional manager used for all allocation writes.
     * @param categoryId - Category UUID being allocated within.
     * @returns The persisted identity and visible key reserved by this transaction.
     */
    async allocateInTransaction(
        manager: EntityManager,
        categoryId: string,
        projectId: string,
    ): Promise<AllocatedRequirementKeyDto> {
        this.validateCategoryId(categoryId);

        const category = await manager.findOne(Category, { where: { id: categoryId } });

        if (category === null) {
            throw new NotFoundException(`Category "${categoryId}" was not found`);
        }

        if (!CATEGORY_KEY_PATTERN.test(category.key)) {
            throw new BadRequestException('Requirement category key must contain 2 to 4 uppercase letters');
        }

        await manager
            .createQueryBuilder()
            .insert()
            .into(RequirementsKeyCounter)
            .values({ categoryId, nextNumber: 1 })
            .orIgnore()
            .execute();

        const counter = await manager.findOne(RequirementsKeyCounter, {
            where: { categoryId },
            lock: { mode: 'pessimistic_write' },
        });

        if (counter === null) {
            throw new ConflictException('Requirement key counter could not be initialized');
        }

        if (counter.nextNumber > MAX_REQUIREMENT_SEQUENCE_NUMBER) {
            throw new ConflictException(
                `Requirement key range exhausted for ${category.type}-${category.key}; maximum sequence is ${MAX_REQUIREMENT_SEQUENCE_NUMBER}`,
            );
        }

        const sequenceNumber = counter.nextNumber;
        counter.nextNumber = sequenceNumber + 1;
        await manager.save(RequirementsKeyCounter, counter);

        const requirement = manager.create(Requirement, {
            type: category.type,
            projectId,
            categoryId,
            category,
            sequenceNumber,
            visibleKey: this.formatVisibleKey(category.type, category.key.toUpperCase(), sequenceNumber),
        });

        const savedRequirement = await manager.save(Requirement, requirement);

        return {
            id: savedRequirement.id,
            type: savedRequirement.type,
            categoryId: savedRequirement.categoryId,
            sequenceNumber: savedRequirement.sequenceNumber,
            visibleKey: savedRequirement.visibleKey,
        };
    }
    /**
     * Formats the externally visible requirement identifier.
     *
     * @param type - Category-derived requirement type prefix.
     * @param categoryKey - Validated uppercase category key.
     * @param sequenceNumber - Durable sequence number already reserved by the counter.
     * @returns Visible key in TYPE-CAT-0001 form.
     */
    private formatVisibleKey(type: RequirementType, categoryKey: string, sequenceNumber: number): string {
        return `${type}-${categoryKey}-${sequenceNumber.toString().padStart(4, '0')}`;
    }

    private validateCategoryId(categoryId: string): void {
        if (typeof categoryId !== 'string' || categoryId.trim() === '') {
            throw new BadRequestException('Category id is required');
        }

        if (!UUID_PATTERN.test(categoryId)) {
            throw new BadRequestException('Category id must be a valid UUID');
        }
    }

    async runWithAllocationConflictMapping<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new ConflictException('Requirement visible key allocation collided with an existing key');
            }

            throw error;
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
