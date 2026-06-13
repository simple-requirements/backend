import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRequirements1781259351593 implements MigrationInterface {
    name = 'CreateRequirements1781259351593';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "requirements_key_counters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_id" uuid NOT NULL, "next_number" integer NOT NULL, CONSTRAINT "CHK_requirements_key_counters_next_number_range" CHECK ("next_number" > 0 AND "next_number" <= 10000), CONSTRAINT "PK_requirements_key_counters" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_requirements_key_counters_category" ON "requirements_key_counters" ("category_id")`,
        );
        await queryRunner.query(
            `CREATE TABLE "requirements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(3) NOT NULL, "category_id" uuid NOT NULL, "sequence_number" integer NOT NULL, "visible_key" character varying(13) NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'draft', "description" text, "priority" character varying(5), "owner" character varying(120), "rationale" text, "source" text, "rejection_reason" text, "reviewer" character varying(120), "rejected_at" TIMESTAMP WITH TIME ZONE, "deleted_at" TIMESTAMP WITH TIME ZONE, "approved_at" TIMESTAMP WITH TIME ZONE, "implemented_at" TIMESTAMP WITH TIME ZONE, "obsolescence_reason" text, "obsolete_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_requirements_visible_key_format" CHECK ("visible_key" ~ '^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$'), CONSTRAINT "CHK_requirements_sequence_number_range" CHECK ("sequence_number" > 0 AND "sequence_number" <= 9999), CONSTRAINT "CHK_requirements_type" CHECK ("type" IN ('FR', 'NFR')), CONSTRAINT "CHK_requirements_status" CHECK ("status" IN ('draft', 'approved', 'implemented', 'obsolete', 'rejected', 'deleted')), CONSTRAINT "CHK_requirements_priority" CHECK ("priority" IN ('p1', 'p2', 'p3')), CONSTRAINT "PK_requirements" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_requirements_category_sequence" ON "requirements" ("category_id", "sequence_number")`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_requirements_visible_key" ON "requirements" ("visible_key")`);
        await queryRunner.query(
            `ALTER TABLE "requirements_key_counters" ADD CONSTRAINT "FK_requirements_key_counters_categories" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "FK_requirements_type_matches_category" FOREIGN KEY ("category_id", "type") REFERENCES "categories"("id", "type") ON DELETE RESTRICT ON UPDATE RESTRICT`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "FK_requirements_type_matches_category"`);
        await queryRunner.query(
            `ALTER TABLE "requirements_key_counters" DROP CONSTRAINT "FK_requirements_key_counters_categories"`,
        );
        await queryRunner.query(`DROP INDEX "public"."UQ_requirements_visible_key"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_requirements_category_sequence"`);
        await queryRunner.query(`DROP TABLE "requirements"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_requirements_key_counters_category"`);
        await queryRunner.query(`DROP TABLE "requirements_key_counters"`);
    }
}
