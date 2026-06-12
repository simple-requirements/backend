import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRequirementRevisions1781280015593 implements MigrationInterface {
    name = 'CreateRequirementRevisions1781280015593';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requirements_key_counters" DROP CONSTRAINT "FK_requirements_categories"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "FK_requirements_categories"`);
        await queryRunner.query(
            `CREATE TABLE "requirements_revision" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requirement_id" uuid NOT NULL, "revision_number" integer NOT NULL, "visible_key" character varying(13) NOT NULL, "type" character varying(3) NOT NULL, "category_id" uuid NOT NULL, "sequence_number" integer NOT NULL, "status" character varying(10) NOT NULL, "description" text, "priority" character varying(5), "owner" character varying(120), "rationale" text, "source" text, "requirement_created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "requirement_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_requirements_revisions_visible_key_format" CHECK ("visible_key" ~ '^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$'), CONSTRAINT "CHK_requirements_revisions_revision_number_range" CHECK ("revision_number" > 0), CONSTRAINT "CHK_requirements_revisions_sequence_number_range" CHECK ("sequence_number" > 0 AND "sequence_number" <= 9999), CONSTRAINT "CHK_requirements_revisions_status" CHECK ("status" IN ('draft')), CONSTRAINT "CHK_requirements_revisions_type" CHECK ("type" IN ('FR', 'NFR')), CONSTRAINT "PK_ec6006a2687325a4d97f6764971" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_requirements_revisions_requirement_revision" ON "requirements_revision"  ("requirement_id", "revision_number") `,
        );
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "CHK_requirements_status"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "status"`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD "status" character varying(10) NOT NULL DEFAULT 'draft'`,
        );
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "priority"`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "priority" character varying(5)`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_status" CHECK ("status" IN ('draft'))`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements_key_counters" ADD CONSTRAINT "FK_8f3286be12057c3bc35e54c36c2" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "FK_ace251381a3eeb56b5a0672fbfb" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements_revision" ADD CONSTRAINT "FK_ca126efeced381fb48bdf5a0009" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requirements_revision" DROP CONSTRAINT "FK_ca126efeced381fb48bdf5a0009"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "FK_ace251381a3eeb56b5a0672fbfb"`);
        await queryRunner.query(
            `ALTER TABLE "requirements_key_counters" DROP CONSTRAINT "FK_8f3286be12057c3bc35e54c36c2"`,
        );
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "CHK_requirements_status"`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "priority"`);
        await queryRunner.query(`ALTER TABLE "requirements" ADD "priority" character varying(40)`);
        await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "status"`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD "status" character varying(20) NOT NULL DEFAULT 'draft'`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "CHK_requirements_status" CHECK (((status)::text = 'draft'::text))`,
        );
        await queryRunner.query(`ALTER TABLE "requirements" ADD "title" character varying(200)`);
        await queryRunner.query(`DROP INDEX "public"."UQ_requirements_revisions_requirement_revision"`);
        await queryRunner.query(`DROP TABLE "requirements_revision"`);
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "FK_requirements_categories" FOREIGN KEY ("category_id", "category_id") REFERENCES "categories"("id","id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements_key_counters" ADD CONSTRAINT "FK_requirements_categories" FOREIGN KEY ("category_id", "category_id") REFERENCES "categories"("id","id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
    }
}
