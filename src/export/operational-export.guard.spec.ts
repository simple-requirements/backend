import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { OperationalExportGuard } from '@/export/operational-export.guard';

function context(secret?: string) {
    return {
        switchToHttp: () => ({ getRequest: () => ({ header: () => secret }) }),
    } as never;
}

describe('OperationalExportGuard', () => {
    it('accepts only the configured operational secret.', () => {
        const guard = new OperationalExportGuard({ get: vi.fn(() => 'configured-secret') } as never);
        expect(guard.canActivate(context('configured-secret'))).toBe(true);
        expect(() => guard.canActivate(context('wrong-secret'))).toThrow(ForbiddenException);
    });

    it('fails closed when no operational secret is configured.', () => {
        const guard = new OperationalExportGuard({ get: vi.fn(() => undefined) } as never);
        expect(() => guard.canActivate(context('anything'))).toThrow(ForbiddenException);
    });
});
