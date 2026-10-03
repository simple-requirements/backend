import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const OPERATIONAL_EXPORT_HEADER = 'x-operational-export-secret';

@Injectable()
export class OperationalExportGuard implements CanActivate {
    constructor(private readonly config: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const configuredSecret = this.config.get<string>('OPERATIONAL_EXPORT_SECRET');
        const suppliedSecret = context.switchToHttp().getRequest<Request>().header(OPERATIONAL_EXPORT_HEADER);
        if (configuredSecret === undefined || configuredSecret.length === 0 || suppliedSecret === undefined) {
            throw new ForbiddenException('Operational export access is not permitted.');
        }

        const expected = Buffer.from(configuredSecret);
        const supplied = Buffer.from(suppliedSecret);
        if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
            throw new ForbiddenException('Operational export access is not permitted.');
        }
        return true;
    }
}
