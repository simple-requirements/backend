import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { AccountRole } from '@/auth/accounts/account-role.enum';
import { ProjectMembership } from '@/auth/authorization/project-membership.entity';
import { ExportAdapterRegistryService } from '@/export/export-adapter-registry.service';
import { ExportBundleBuilderService } from '@/export/export-bundle-builder.service';
import type { CanonicalExportBundle, ExportFormatDescriptor, ExportScope, RenderedExport } from '@/export/export.types';
import { Project } from '@/projects/projects.entity';
import { Requirement } from '@/projects/requirements.entity';

@Injectable()
export class ExportService {
    constructor(
        private readonly builder: ExportBundleBuilderService,
        private readonly registry: ExportAdapterRegistryService,
        private readonly dataSource: DataSource,
    ) {}

    formats(): ExportFormatDescriptor[] {
        return this.registry.list();
    }

    async allProjects(formatId: string): Promise<RenderedExport> {
        return this.render('all_projects', formatId, await this.builder.allProjects(formatId));
    }

    async project(
        projectId: string,
        formatId: string,
        actor: { userId: string; role: AccountRole },
    ): Promise<RenderedExport> {
        if ((await this.dataSource.getRepository(Project).findOneBy({ id: projectId })) === null) {
            throw new NotFoundException(`Project with id "${projectId}" was not found.`);
        }
        await this.requireProjectExportAccess([projectId], actor);
        const bundle = await this.builder.project(projectId, formatId);
        return this.render('project', formatId, bundle, bundle.projects[0]?.project.name);
    }

    async requirements(
        requirementIds: string[],
        formatId: string,
        actor: { userId: string; role: AccountRole },
    ): Promise<RenderedExport> {
        await this.requireSelectionAccess(requirementIds, actor);
        return this.render('requirements', formatId, await this.builder.requirementSelection(requirementIds, formatId));
    }

    private render(
        scope: ExportScope,
        formatId: string,
        bundle: CanonicalExportBundle,
        projectName?: string,
    ): RenderedExport {
        const adapter = this.registry.get(formatId);
        const stem = scope === 'project' && projectName !== undefined
            ? this.filenameStem(projectName)
            : scope.replace('_', '-');
        return {
            content: adapter.render(bundle),
            mediaType: adapter.mediaType,
            filename: `${stem}.${adapter.fileExtension}`,
        };
    }

    private async requireSelectionAccess(
        requirementIds: string[],
        actor: { userId: string; role: AccountRole },
    ): Promise<void> {
        if (actor.role !== AccountRole.RequirementsEngineer) throw new ForbiddenException('Export access is not permitted.');
        const requirements = await this.dataSource.getRepository(Requirement).find({
            select: { id: true, projectId: true },
            where: { id: In([...new Set(requirementIds)]) },
        });
        const projectIds = [...new Set(requirements.map(({ projectId }) => projectId))];
        await this.requireProjectExportAccess(projectIds, actor);
    }

    private async requireProjectExportAccess(
        projectIds: string[],
        actor: { userId: string; role: AccountRole },
    ): Promise<void> {
        if (actor.role !== AccountRole.RequirementsEngineer) throw new ForbiddenException('Export access is not permitted.');
        if (projectIds.length === 0) return;
        const memberships = await this.dataSource.getRepository(ProjectMembership).find({
            where: { userId: actor.userId, projectId: In(projectIds) },
        });
        if (memberships.length !== projectIds.length) throw new ForbiddenException('Export access is not permitted.');
    }

    private filenameStem(value: string): string {
        const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return normalized.length === 0 ? 'project-export' : normalized;
    }
}
