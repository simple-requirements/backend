import { Test, type TestingModule } from '@nestjs/testing';
import { describe, beforeEach, expect, it } from 'vitest';

import { ProjectsService } from '@/projects/projects.service';

describe('ProjectsService', () => {
    let service: ProjectsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({ providers: [ProjectsService] }).compile();

        service = module.get<ProjectsService>(ProjectsService);
    });

    it('is defined', () => {
        expect(service).toBeDefined();
    });
});
