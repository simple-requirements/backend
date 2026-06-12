import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequirementApprovedImplementedObsoleteLifecycle1781290000000 implements MigrationInterface {
    name = 'RequirementApprovedImplementedObsoleteLifecycle1781290000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "CHK_requirements_status"`);
        await queryRunner.query(`ALTER TABLE "requirements" ALTER COLUMN "status" TYPE character varying(20)`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_status" CHECK ("status" IN ('draft', 'approved', 'implemented', 'obsolete', 'rejected', 'deleted'))`,
        );
        await queryRunner.query(`ALTER TABLE "requirements" ADD "approved_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "implemented_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "obsolescence_reason" text`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "obsolete_at" TIMESTAMP WITH TIME ZONE`);

        await queryRunner.query(
            `ALTER TABLE "requirements_revision" DROP CONSTRAINT "CHK_requirements_revisions_status"`,
        );
        await queryRunner.query(`ALTER TABLE "requirements_revision" ALTER COLUMN "status" TYPE character varying(20)`);
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" ADD CONSTRAINT "CHK_requirements_revisions_status" CHECK ("status" IN ('draft', 'approved', 'implemented', 'obsolete', 'rejected', 'deleted'))`,
        );
        await queryRunner.query(`ALTER TABLE "requirements_revision" ADD "approved_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" ADD "implemented_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" ADD "obsolescence_reason" text`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" ADD "obsolete_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requirements_revision" DROP COLUMN "obsolete_at"`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" DROP COLUMN "obsolescence_reason"`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" DROP COLUMN "implemented_at"`);
        await queryRunner.query(`ALTER TABLE "requirements_revision" DROP COLUMN "approved_at"`);
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" DROP CONSTRAINT "CHK_requirements_revisions_status"`,
        );
        await queryRunner.query(`ALTER TABLE "requirements_revision" ALTER COLUMN "status" TYPE character varying(10)`);
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" ADD CONSTRAINT "CHK_requirements_revisions_status" CHECK ("status" IN ('draft', 'rejected', 'deleted'))`,
        );

        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "obsolete_at"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "obsolescence_reason"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "implemented_at"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "approved_at"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "CHK_requirements_status"`);
        await queryRunner.query(`ALTER TABLE "requirements" ALTER COLUMN "status" TYPE character varying(10)`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_status" CHECK ("status" IN ('draft', 'rejected', 'deleted'))`,
        );
    }
}
