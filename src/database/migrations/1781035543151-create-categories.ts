import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategories1780861776776 implements MigrationInterface {
    name = 'CreateCategories.ts1781035543151';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "key" character varying(4) NOT NULL, "type" character varying(3) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_categories_type" CHECK ("type" IN ('FR', 'NFR')), CONSTRAINT "CHK_categories_key_format" CHECK ("key" ~ '^[A-Z]{2,4}$'), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_categories_key" ON "categories"  ("key") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_categories_id_type" ON "categories"  ("id", "type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_categories_id_type"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_categories_key"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }
}
