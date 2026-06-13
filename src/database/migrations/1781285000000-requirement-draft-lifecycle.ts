import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequirementDraftLifecycle1781285000000 implements MigrationInterface {
    name = 'RequirementDraftLifecycle1781285000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD COLUMN IF NOT EXISTS "status" character varying(10) NOT NULL DEFAULT 'draft'`,
        );
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT IF EXISTS "CHK_requirements_status"`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_status" CHECK ("status" IN ('draft', 'rejected', 'deleted'))`,
        );
        await queryRunner.query(`ALTER TABLE "requirements" ADD "rejection_reason" text`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "reviewer" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "rejected_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);

        await queryRunner.query(
            `ALTER TABLE "requirements_revision" DROP CONSTRAINT "CHK_requirements_revisions_status"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" ADD CONSTRAINT "CHK_requirements_revisions_status" CHECK ("status" IN ('draft', 'rejected', 'deleted'))`,
        );
        await queryRunner.query(`ALTER TABLE "requirements_revision" ADD "rejection_reason" text`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" ADD "reviewer" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" ADD "rejected_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requirements_revision" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" DROP COLUMN "rejected_at"`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" DROP COLUMN "reviewer"`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" DROP COLUMN "rejection_reason"`);
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" DROP CONSTRAINT "CHK_requirements_revisions_status"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" ADD CONSTRAINT "CHK_requirements_revisions_status" CHECK ("status" IN ('draft'))`,
        );

        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "rejected_at"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "reviewer"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "rejection_reason"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "CHK_requirements_status"`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_status" CHECK ("status" IN ('draft'))`,
        );
    }
}
