import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRequirementLinkHistory1785000000000 implements MigrationInterface {
    name = 'CreateRequirementLinkHistory1785000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "requirement_link_history" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "link_id" uuid NOT NULL,
            "project_id" uuid NOT NULL,
            "source_requirement_id" uuid NOT NULL,
            "old_target_requirement_id" uuid,
            "new_target_requirement_id" uuid,
            "relationship_type" character varying(20) NOT NULL DEFAULT 'references',
            "event_type" character varying(32) NOT NULL,
            "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
            "actor" character varying(120),
            "reason" text,
            CONSTRAINT "CHK_requirement_link_history_relationship_type" CHECK ("relationship_type" IN ('references')),
            CONSTRAINT "CHK_requirement_link_history_event_type" CHECK ("event_type" IN ('created', 'target_changed', 'deleted')),
            CONSTRAINT "PK_requirement_link_history" PRIMARY KEY ("id")
        )`);
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_link_history_link_id" ON "requirement_link_history" ("link_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_link_history_project_id" ON "requirement_link_history" ("project_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_link_history_source_requirement_id" ON "requirement_link_history" ("source_requirement_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_link_history_old_target_requirement_id" ON "requirement_link_history" ("old_target_requirement_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_link_history_new_target_requirement_id" ON "requirement_link_history" ("new_target_requirement_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_requirement_link_history_occurred_at" ON "requirement_link_history" ("occurred_at")`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" ADD CONSTRAINT "FK_requirement_link_history_link" FOREIGN KEY ("link_id") REFERENCES "requirement_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" ADD CONSTRAINT "FK_requirement_link_history_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" ADD CONSTRAINT "FK_requirement_link_history_source_requirement" FOREIGN KEY ("source_requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" ADD CONSTRAINT "FK_requirement_link_history_old_target_requirement" FOREIGN KEY ("old_target_requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" ADD CONSTRAINT "FK_requirement_link_history_new_target_requirement" FOREIGN KEY ("new_target_requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" DROP CONSTRAINT "FK_requirement_link_history_new_target_requirement"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" DROP CONSTRAINT "FK_requirement_link_history_old_target_requirement"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" DROP CONSTRAINT "FK_requirement_link_history_source_requirement"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" DROP CONSTRAINT "FK_requirement_link_history_project"`,
        );
        await queryRunner.query(
            `ALTER TABLE "requirement_link_history" DROP CONSTRAINT "FK_requirement_link_history_link"`,
        );
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_link_history_occurred_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_link_history_new_target_requirement_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_link_history_old_target_requirement_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_link_history_source_requirement_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_link_history_project_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requirement_link_history_link_id"`);
        await queryRunner.query(`DROP TABLE "requirement_link_history"`);
    }
}
