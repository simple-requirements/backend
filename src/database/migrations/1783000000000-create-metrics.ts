import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetrics1783000000000 implements MigrationInterface {
    name = 'CreateMetrics1783000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "metrics" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "project_id" uuid NOT NULL,
            "key" character varying(8) NOT NULL,
            "value" text NOT NULL,
            "description" text,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "CHK_metrics_key_format" CHECK ("key" ~ '^MET-[0-9]{4}$'),
            CONSTRAINT "CHK_metrics_value_not_blank" CHECK (btrim("value") <> ''),
            CONSTRAINT "PK_metrics" PRIMARY KEY ("id")
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_metrics_project_id" ON "metrics" ("project_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_metrics_project_key" ON "metrics" ("project_id", "key")`);
        await queryRunner.query(`CREATE TABLE "requirement_metric_links" (
            "requirement_id" uuid NOT NULL,
            "metric_id" uuid NOT NULL,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "PK_requirement_metric_links" PRIMARY KEY ("requirement_id", "metric_id")
        )`);
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_metric_links_requirement_id" ON "requirement_metric_links" ("requirement_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_metric_links_metric_id" ON "requirement_metric_links" ("metric_id")`,
        );
        await queryRunner.query(
            `ALTER TABLE "metrics" ADD CONSTRAINT "FK_metrics_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_metric_links" ADD CONSTRAINT "FK_requirement_metric_links_requirement" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_metric_links" ADD CONSTRAINT "FK_requirement_metric_links_metric" FOREIGN KEY ("metric_id") REFERENCES "metrics"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "requirement_metric_links" DROP CONSTRAINT "FK_requirement_metric_links_metric"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_metric_links" DROP CONSTRAINT "FK_requirement_metric_links_requirement"`,
        );
        await queryRunner.query(`ALTER TABLE "metrics" DROP CONSTRAINT "FK_metrics_project"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_metric_links_metric_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_metric_links_requirement_id"`);
        await queryRunner.query(`DROP TABLE "requirement_metric_links"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_metrics_project_key"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_metrics_project_id"`);
        await queryRunner.query(`DROP TABLE "metrics"`);
    }
}
