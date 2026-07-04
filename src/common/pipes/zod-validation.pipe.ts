import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

type ZodValidationIssue = Readonly<{ message: string }>;

type ZodParseResult<TOutput> =
    | Readonly<{ success: true; data: TOutput }>
    | Readonly<{ success: false; error: Readonly<{ issues: readonly ZodValidationIssue[] }> }>;

export interface ZodValidationSchema<TOutput> {
    parse(value: unknown): TOutput;
    safeParse(value: unknown): ZodParseResult<TOutput>;
}

@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
    constructor(private readonly schema: ZodValidationSchema<TOutput>) {}

    transform(value: unknown): TOutput {
        const parseResult = this.schema.safeParse(value);

        if (!parseResult.success) {
            const message = parseResult.error.issues[0]?.message ?? 'Request validation failed.';

            throw new BadRequestException(message);
        }

        return parseResult.data;
    }
}
