import { Test } from '@nestjs/testing';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { RequirementLinkHistoryEventType } from '@/requirements/requirement-link-history.entity';
import { RequirementLinkRelationshipType } from '@/requirements/requirement-link.entity';
import { RequirementLinksController } from '@/requirements/requirement-links.controller';
import { RequirementLinksService } from '@/requirements/requirement-links.service';

const requirementId = '11111111-1111-4111-8111-111111111111';
const linkId = '22222222-2222-4222-8222-222222222222';

const serviceMock = {
    create: vi.fn(),
    listHistory: vi.fn(),
    listRevisionLinks: vi.fn(),
    listChanges: vi.fn(),
    listOutgoing: vi.fn(),
    listIncoming: vi.fn(),
    listProject: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
};

describe('RequirementLinksController', () => {
    let controller: RequirementLinksController;

    beforeEach(async () => {
        vi.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            controllers: [RequirementLinksController],
            providers: [{ provide: RequirementLinksService, useValue: serviceMock }],
        }).compile();
        controller = moduleRef.get(RequirementLinksController);
    });

    it('delegates link history listing to the service.', async () => {
        const event = {
            id: '33333333-3333-4333-8333-333333333333',
            linkId,
            projectId: '44444444-4444-4444-8444-444444444444',
            eventType: RequirementLinkHistoryEventType.Created,
            relationshipType: RequirementLinkRelationshipType.References,
            sourceRequirementId: requirementId,
            sourceVisibleKey: 'FR-DATA-0001',
            oldTargetRequirementId: null,
            oldTargetVisibleKey: null,
            newTargetRequirementId: '55555555-5555-4555-8555-555555555555',
            newTargetVisibleKey: 'NFR-PERF-0001',
            occurredAt: '2026-06-12T00:00:00.000Z',
            actor: null,
            reason: null,
        };
        serviceMock.listHistory.mockResolvedValue([event]);

        await expect(controller.listHistory(requirementId)).resolves.toEqual([event]);

        expect(serviceMock.listHistory).toHaveBeenCalledWith(requirementId);
    });

    it('delegates revision link state lookup to the service.', async () => {
        const response = {
            requirementId,
            revisionNumber: 1,
            revisionCreatedAt: '2026-06-12T00:00:00.000Z',
            outgoingLinks: [],
            incomingLinks: [],
        };
        serviceMock.listRevisionLinks.mockResolvedValue(response);

        await expect(controller.listRevisionLinks(requirementId, 1)).resolves.toEqual(response);

        expect(serviceMock.listRevisionLinks).toHaveBeenCalledWith(requirementId, 1);
    });

    it('delegates revision link diff lookup to the service.', async () => {
        const response = {
            requirementId,
            fromRevision: 1,
            toRevision: 2,
            addedOutgoingLinks: [],
            removedOutgoingLinks: [],
            unchangedOutgoingLinks: [],
            addedIncomingLinks: [],
            removedIncomingLinks: [],
            unchangedIncomingLinks: [],
        };
        serviceMock.listChanges.mockResolvedValue(response);

        await expect(controller.listChanges(requirementId, 1, 2)).resolves.toEqual(response);

        expect(serviceMock.listChanges).toHaveBeenCalledWith(requirementId, 1, 2);
    });
});
