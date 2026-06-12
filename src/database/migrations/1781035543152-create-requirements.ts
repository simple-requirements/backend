import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRequirements1781035543152 implements MigrationInterface {
    name = 'CreateRequirements1781035543152';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "requirement_key_counters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kind" character varying(3) NOT NULL, "category_id" uuid NOT NULL, "next_number" integer NOT NULL, CONSTRAINT "CHK_requirement_key_counters_kind" CHECK ("kind" IN ('FR', 'NFR')), CONSTRAINT "CHK_requirement_key_counters_next_number_range" CHECK ("next_number" >= 0 AND "next_number" <= 10000), CONSTRAINT "PK_requirement_key_counters" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_requirement_key_counters_kind_category" ON "requirement_key_counters" ("kind", "category_id")`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_key_counters" ADD CONSTRAINT "FK_requirement_key_counters_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );

        await queryRunner.query(
            `CREATE TABLE "requirements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kind" character varying(3) NOT NULL, "category_id" uuid NOT NULL, "sequence_number" integer NOT NULL, "visible_key" character varying(50) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_requirements_kind" CHECK ("kind" IN ('FR', 'NFR')), CONSTRAINT "CHK_requirements_sequence_number_range" CHECK ("sequence_number" >= 0 AND "sequence_number" <= 9999), CONSTRAINT "CHK_requirements_visible_key_format" CHECK ("visible_key" ~ '^(FR|NFR)-[A-Z][A-Z0-9_]*-[0-9]{4}$'), CONSTRAINT "PK_requirements" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_requirements_visible_key" ON "requirements" ("visible_key")`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_requirements_kind_category_sequence" ON "requirements" ("kind", "category_id", "sequence_number")`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirements" ADD CONSTRAINT "FK_requirements_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requirements" DROP CONSTRAINT "FK_requirements_category"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_requirements_kind_category_sequence"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_requirements_visible_key"`);
        await queryRunner.query(`DROP TABLE "requirements"`);

        await queryRunner.query(
            `ALTER TABLE "requirement_key_counters" DROP CONSTRAINT "FK_requirement_key_counters_category"`,
        );
        await queryRunner.query(`DROP INDEX "public"."UQ_requirement_key_counters_kind_category"`);
        await queryRunner.query(`DROP TABLE "requirement_key_counters"`);
    }
}
