import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CategoriesController } from "@/projects/categories.controller";
import { Category } from "@/projects/categories.entity";
import { Project } from "@/projects/projects.entity";
import { ProjectsController } from "@/projects/projects.controller";
import { ProjectsService } from "@/projects/projects.service";
import { RequirementRevision } from "@/projects/requirement-revisions.entity";
import { RequirementsController } from "@/projects/requirements.controller";
import { Requirement } from "@/projects/requirements.entity";
import { RequirementImplementationTicket } from "@/projects/requirement-implementation-ticket.entity";
import { ImplementationTicketsController } from "@/projects/implementation-tickets.controller";
import { AuthModule } from "@/auth/auth.module";
import { RequirementLifecycleService } from "@/projects/requirements/requirement-lifecycle.service";
import { RequirementResponseMapper } from "@/projects/requirements/requirement-response.mapper";
import { RequirementRevisionService } from "@/projects/requirements/requirement-revision.service";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Project,
      Category,
      Requirement,
      RequirementRevision,
      RequirementImplementationTicket,
    ]),
  ],
  controllers: [
    ProjectsController,
    CategoriesController,
    RequirementsController,
    ImplementationTicketsController,
  ],
  providers: [
    ProjectsService,
    RequirementLifecycleService,
    RequirementResponseMapper,
    RequirementRevisionService,
  ],
  exports: [
    ProjectsService,
    RequirementLifecycleService,
    RequirementResponseMapper,
    RequirementRevisionService,
  ],
})
// Nest modules are declarative; the decorator contains the module configuration.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ProjectsModule {}
