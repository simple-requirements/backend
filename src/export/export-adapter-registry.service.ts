import { BadRequestException, Injectable } from '@nestjs/common';
import { AsciiDocExportAdapter } from '@/export/adapters/asciidoc-export.adapter';
import { JsonExportAdapter } from '@/export/adapters/json-export.adapter';
import { MarkdownExportAdapter } from '@/export/adapters/markdown-export.adapter';
import type { ExportFormatAdapter, ExportFormatDescriptor } from '@/export/export.types';

@Injectable()
export class ExportAdapterRegistryService {
    private readonly adapters: readonly ExportFormatAdapter[] = [
        new JsonExportAdapter(),
        new MarkdownExportAdapter(),
        new AsciiDocExportAdapter(),
    ];

    list(): ExportFormatDescriptor[] {
        return this.adapters.map((adapter) => ({
            id: adapter.id,
            label: adapter.label,
            fileExtension: adapter.fileExtension,
            mediaType: adapter.mediaType,
            formatClass: adapter.formatClass,
            capabilities: adapter.capabilities,
        }));
    }

    get(formatId: string): ExportFormatAdapter {
        const adapter = this.adapters.find((candidate) => candidate.id === formatId);
        if (adapter === undefined) throw new BadRequestException(`Unsupported export format "${formatId}".`);
        return adapter;
    }
}
