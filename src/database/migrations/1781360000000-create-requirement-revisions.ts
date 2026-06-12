import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRequirementRevisions1781360000000 implements MigrationInterface {
    name = 'CreateRequirementRevisions1781360000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "requirement_revisions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requirement_id" uuid NOT NULL, "revision_number" integer NOT NULL, "visible_key" character varying(13) NOT NULL, "type" character varying(3) NOT NULL, "category_id" uuid NOT NULL, "sequence_number" integer NOT NULL, "status" character varying(10) NOT NULL, "description" text, "priority" character varying(40), "owner" character varying(120), "rationale" text, "source" text, "requirement_created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "requirement_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_requirement_revisions_type" CHECK ("type" IN ('FR', 'NFR')), CONSTRAINT "CHK_requirement_revisions_status" CHECK ("status" IN ('draft')), CONSTRAINT "CHK_requirement_revisions_sequence_number_range" CHECK ("sequence_number" > 0 AND "sequence_number" <= 9999), CONSTRAINT "CHK_requirement_revisions_revision_number_range" CHECK ("revision_number" > 0), CONSTRAINT "CHK_requirement_revisions_visible_key_format" CHECK ("visible_key" ~ '^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$'), CONSTRAINT "PK_requirement_revisions" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_requirement_revisions_requirement_revision" ON "requirement_revisions" ("requirement_id", "revision_number")`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_revisions" ADD CONSTRAINT "FK_requirement_revisions_requirement" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "requirement_revisions" DROP CONSTRAINT "FK_requirement_revisions_requirement"`,
        );
        await queryRunner.query(`DROP INDEX "public"."UQ_requirement_revisions_requirement_revision"`);
        await queryRunner.query(`DROP TABLE "requirement_revisions"`);
    }
}
