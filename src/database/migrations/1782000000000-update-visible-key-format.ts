import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateVisibleKeyFormat1782000000000 implements MigrationInterface {
    name = 'UpdateVisibleKeyFormat1782000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "CHK_requirements_visible_key_format"`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_visible_key_format" CHECK ("visible_key" ~ '^(FR|NFR)-[A-Z]{2,4}-[0-9]{4}$')`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" DROP CONSTRAINT "CHK_requirements_revisions_visible_key_format"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" ADD CONSTRAINT "CHK_requirements_revisions_visible_key_format" CHECK ("visible_key" ~ '^(FR|NFR)-[A-Z]{2,4}-[0-9]{4}$')`,
        );
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "CHK_categories_key_format"`);
        await queryRunner.query(
            `ALTER TABLE "categories" ADD CONSTRAINT "CHK_categories_key_format" CHECK ("key" ~ '^[A-Z]{2,4}$')`,
        );
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "key" TYPE character varying(4)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "key" TYPE character varying(40)`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "CHK_categories_key_format"`);
        await queryRunner.query(
            `ALTER TABLE "categories" ADD CONSTRAINT "CHK_categories_key_format" CHECK ("key" ~ '^[A-Z][A-Z0-9_]*$')`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" DROP CONSTRAINT "CHK_requirements_revisions_visible_key_format"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" ADD CONSTRAINT "CHK_requirements_revisions_visible_key_format" CHECK ("visible_key" ~ '^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$')`,
        );
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "CHK_requirements_visible_key_format"`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_visible_key_format" CHECK ("visible_key" ~ '^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$')`,
        );
    }
}
