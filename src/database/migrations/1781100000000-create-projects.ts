import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjects1781100000000 implements MigrationInterface {
    name = 'CreateProjects1781100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "projects" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(120) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_projects_name_not_blank"
                    CHECK (btrim("name") <> ''),
                CONSTRAINT "PK_projects"
                    PRIMARY KEY ("id")
            )`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "projects"`);
    }
}
