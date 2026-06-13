import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteRequirementsDraftFields1781270000000 implements MigrationInterface {
    name = 'CompleteRequirementsDraftFields1781270000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "requirements" DROP CONSTRAINT IF EXISTS "CHK_requirements_visible_key_format"`,
        );
        await queryRunner.query(`ALTER TABLE "requirements" ALTER COLUMN "visible_key" TYPE character varying(13)`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD "status" character varying(10) NOT NULL DEFAULT 'draft'`,
        );
        await queryRunner.query(`ALTER TABLE "requirements" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "priority" character varying(5)`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "owner" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "rationale" text`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "source" text`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_status" CHECK ("status" IN ('draft'))`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_visible_key_format" CHECK ("visible_key" ~ '^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$')`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "FK_requirements_categories" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "FK_requirements_categories"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "CHK_requirements_visible_key_format"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "CHK_requirements_status"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "source"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "rationale"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "owner"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "priority"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "requirements" ALTER COLUMN "visible_key" TYPE character varying(10)`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_visible_key_format" CHECK ("visible_key" ~ '/^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$/gm')`,
        );
    }
}
