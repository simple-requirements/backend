import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRequirementLinks1784000000000 implements MigrationInterface {
    name = 'CreateRequirementLinks1784000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "requirement_links" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "project_id" uuid NOT NULL,
            "source_requirement_id" uuid NOT NULL,
            "target_requirement_id" uuid NOT NULL,
            "relationship_type" character varying(20) NOT NULL DEFAULT 'references',
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "deleted_at" TIMESTAMP WITH TIME ZONE,
            CONSTRAINT "CHK_requirement_links_relationship_type" CHECK ("relationship_type" IN ('references')),
            CONSTRAINT "CHK_requirement_links_no_self_link" CHECK ("source_requirement_id" <> "target_requirement_id"),
            CONSTRAINT "PK_requirement_links" PRIMARY KEY ("id")
        )`);
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_links_project_id" ON "requirement_links" ("project_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_links_source_requirement_id" ON "requirement_links" ("source_requirement_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_links_target_requirement_id" ON "requirement_links" ("target_requirement_id")`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_requirement_links_active_source_target_type" ON "requirement_links" ("source_requirement_id", "target_requirement_id", "relationship_type") WHERE deleted_at IS NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_links" ADD CONSTRAINT "FK_requirement_links_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_links" ADD CONSTRAINT "FK_requirement_links_source_requirement" FOREIGN KEY ("source_requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_links" ADD CONSTRAINT "FK_requirement_links_target_requirement" FOREIGN KEY ("target_requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "requirement_links" DROP CONSTRAINT "FK_requirement_links_target_requirement"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_links" DROP CONSTRAINT "FK_requirement_links_source_requirement"`,
        );
        await queryRunner.query(`ALTER TABLE "requirement_links" DROP CONSTRAINT "FK_requirement_links_project"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_requirement_links_active_source_target_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_links_target_requirement_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_links_source_requirement_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_links_project_id"`);
        await queryRunner.query(`DROP TABLE "requirement_links"`);
    }
}
