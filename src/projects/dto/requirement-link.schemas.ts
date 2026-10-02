import { z } from 'zod';

import { VISIBLE_KEY_PATTERN } from '@/projects/requirement.constants';

const targetKeySchema = z.string().trim().regex(VISIBLE_KEY_PATTERN, 'Target requirement key has an invalid format.');

export const createRequirementLinkSchema = z.object({ targetKey: targetKeySchema }).strict();
export const updateRequirementLinkSchema = z.object({ targetKey: targetKeySchema }).strict();
