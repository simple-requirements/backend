import type { ExecutionContext } from '@nestjs/common';
import { expect, it, vi } from 'vitest';

import { AccountRole } from '@/auth/accounts/account-role.enum';
import { SessionAuthGuard } from '@/auth/sessions/session-auth.guard';

it('stores the authenticated principal on the request.', async () => {
    const principal = { user: {}, session: {}, role: AccountRole.Viewer };
    const sessions = { authenticate: vi.fn().mockResolvedValue(principal) };
    const guard = new SessionAuthGuard(sessions as never);
    const request = { headers: { authorization: 'Bearer token' } } as never;
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty('authentication', principal);
});
