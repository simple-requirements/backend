import { beforeEach, describe, expect, it } from 'vitest';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';

describe('AppController', () => {
    let controller: AppController;

    beforeEach(() => {
        controller = new AppController(new AppService());
    });

    it('returns the application greeting', () => {
        expect(controller.getHello()).toBe('Hello World!');
    });
});
