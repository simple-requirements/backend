import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

describe('ZodValidationPipe', () => {
    it('returns the parsed value.', () => {
        const pipe = new ZodValidationPipe(
            z.object({ name: z.string().transform((value) => value.trim()) }),
        );

        const result = pipe.transform({ name: '  Test project  ' });

        expect(result).toEqual({ name: 'Test project' });
    });

    it('throws BadRequestException with the first Zod issue message.', () => {
        const pipe = new ZodValidationPipe(
            z.object({ name: z.string().min(1, { message: 'Name must not be empty.' }) }),
        );

        expect(() => pipe.transform({ name: '' })).toThrow(BadRequestException);
        expect(() => pipe.transform({ name: '' })).toThrow('Name must not be empty.');
    });
});
