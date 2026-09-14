import type { MigrationInterface, QueryRunner } from "typeorm";

const REQUIREMENT_PROJECT_FOREIGN_KEY =
  "FK_requirements_project_id_projects_id";

export class RestrictRequirementProjectDeletion1770000000000 implements MigrationInterface {
  name = "RestrictRequirementProjectDeletion1770000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "requirements" DROP CONSTRAINT "${REQUIREMENT_PROJECT_FOREIGN_KEY}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "requirements" ADD CONSTRAINT "${REQUIREMENT_PROJECT_FOREIGN_KEY}" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "requirements" DROP CONSTRAINT "${REQUIREMENT_PROJECT_FOREIGN_KEY}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "requirements" ADD CONSTRAINT "${REQUIREMENT_PROJECT_FOREIGN_KEY}" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE`,
    );
  }
}
