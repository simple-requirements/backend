import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';

describe('AppController', () => {
    let controller: AppController;

    const appServiceMock = { getHello: vi.fn() };

    beforeEach(async () => {
        vi.clearAllMocks();

        const moduleRef = await Test.createTestingModule({
            controllers: [AppController],
            providers: [{ provide: AppService, useValue: appServiceMock }],
        }).compile();

        controller = moduleRef.get(AppController);
    });

    it('returns the app service greeting.', () => {
        appServiceMock.getHello.mockReturnValue('Hello World!');

        expect(controller.getHello()).toBe('Hello World!');
        expect(appServiceMock.getHello).toHaveBeenCalledOnce();
    });
});
