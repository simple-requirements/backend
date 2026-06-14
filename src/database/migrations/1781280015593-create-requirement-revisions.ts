import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRequirementRevisions1781280015593 implements MigrationInterface {
    name = 'CreateRequirementRevisions1781280015593';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "requirements_revision" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "requirement_id" uuid NOT NULL,
                "revision_number" integer NOT NULL,
                "visible_key" character varying(13) NOT NULL,
                "type" character varying(3) NOT NULL,
                "project_id" uuid NOT NULL,
                "category_id" uuid NOT NULL,
                "sequence_number" integer NOT NULL,
                "status" character varying(10) NOT NULL,
                "description" text,
                "priority" character varying(5),
                "owner" character varying(120),
                "rationale" text,
                "source" text,
                "rejection_reason" text,
                "reviewer" character varying(120),
                "rejected_at" TIMESTAMP WITH TIME ZONE,
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "approved_at" TIMESTAMP WITH TIME ZONE,
                "implemented_at" TIMESTAMP WITH TIME ZONE,
                "obsolescence_reason" text,
                "obsolete_at" TIMESTAMP WITH TIME ZONE,
                "requirement_created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "requirement_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

                CONSTRAINT "CHK_requirements_revisions_visible_key_format"
                    CHECK (
                        "visible_key" ~ '^(FR|NFR)-[A-Z]{3,4}-[0-9]{4}$'
                    ),

                CONSTRAINT "CHK_requirements_revisions_revision_number_range"
                    CHECK (
                        "revision_number" > 0
                    ),

                CONSTRAINT "CHK_requirements_revisions_sequence_number_range"
                    CHECK (
                        "sequence_number" > 0
                        AND "sequence_number" <= 9999
                    ),

                CONSTRAINT "CHK_requirements_revisions_status"
                    CHECK (
                        "status" IN (
                            'draft',
                            'approved',
                            'implemented',
                            'obsolete',
                            'rejected',
                            'deleted'
                        )
                    ),

                CONSTRAINT "CHK_requirements_revisions_type"
                    CHECK (
                        "type" IN ('FR', 'NFR')
                    ),

                CONSTRAINT "PK_ec6006a2687325a4d97f6764971"
                    PRIMARY KEY ("id")
            )`,
        );

        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_requirements_revisions_requirement_revision"
             ON "requirements_revision" (
                 "requirement_id",
                 "revision_number"
             )`,
        );

        await queryRunner.query(
            `CREATE INDEX "IDX_requirements_revision_project_id"
             ON "requirements_revision" ("project_id")`,
        );

        await queryRunner.query(
            `ALTER TABLE "requirements_revision"
             ADD CONSTRAINT "FK_requirements_revision_project"
             FOREIGN KEY ("project_id")
             REFERENCES "projects"("id")
             ON DELETE RESTRICT
             ON UPDATE NO ACTION`,
        );

        await queryRunner.query(
            `ALTER TABLE "requirements_revision"
             ADD CONSTRAINT "FK_ca126efeced381fb48bdf5a0009"
             FOREIGN KEY ("requirement_id")
             REFERENCES "requirements"("id")
             ON DELETE CASCADE
             ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "requirements_revision"
             DROP CONSTRAINT "FK_ca126efeced381fb48bdf5a0009"`,
        );

        await queryRunner.query(
            `ALTER TABLE "requirements_revision"
             DROP CONSTRAINT "FK_requirements_revision_project"`,
        );

        await queryRunner.query(`DROP INDEX "public"."IDX_requirements_revision_project_id"`);

        await queryRunner.query(`DROP INDEX "public"."UQ_requirements_revisions_requirement_revision"`);

        await queryRunner.query(`DROP TABLE "requirements_revision"`);
    }
}
