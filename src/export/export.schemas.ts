import { z } from 'zod';

const uuidList = z
    .string({ error: 'Requirement ids are required.' })
    .trim()
    .min(1, 'Requirement ids are required.')
    .transform((value) => value.split(',').map((part) => part.trim()))
    .pipe(z.array(z.uuid('Requirement ids must be UUIDs.')).min(1));

export const exportFormatQuerySchema = z.object({ format: z.string().trim().min(1).default('json') });
export const requirementSelectionExportQuerySchema = z.object({
    id: uuidList,
    format: z.string().trim().min(1).default('json'),
});

export type ExportFormatQuery = z.infer<typeof exportFormatQuerySchema>;
export type RequirementSelectionExportQuery = z.infer<typeof requirementSelectionExportQuerySchema>;
