import { MigrationInterface } from 'typeorm';

export class CompleteRequirementsDraftFields1781270000000 implements MigrationInterface {
    name = 'CompleteRequirementsDraftFields1781270000000';

    public async up(): Promise<void> {
        // Requirements table shape is composed in CreateRequirements1781259351593.
    }

    public async down(): Promise<void> {
        // Requirements table shape is reverted in CreateRequirements1781259351593.
    }
}
