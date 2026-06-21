import { ApiProperty } from '@nestjs/swagger';
import { RequirementLinkRelationshipType } from '@/requirements/requirement-link.entity';
import { RequirementLinkHistoryEventType } from '@/requirements/requirement-link-history.entity';
import { RequirementLinkResponseDto } from '@/requirements/dto/requirement-link.dto';

export class RequirementLinkHistoryResponseDto {
    @ApiProperty({ format: 'uuid' }) id!: string;
    @ApiProperty({ format: 'uuid' }) linkId!: string;
    @ApiProperty({ format: 'uuid' }) projectId!: string;
    @ApiProperty({ enum: RequirementLinkHistoryEventType }) eventType!: RequirementLinkHistoryEventType;
    @ApiProperty({ enum: RequirementLinkRelationshipType }) relationshipType!: RequirementLinkRelationshipType;
    @ApiProperty({ format: 'uuid' }) sourceRequirementId!: string;
    @ApiProperty({ example: 'FR-DATA-0001' }) sourceVisibleKey!: string;
    @ApiProperty({ format: 'uuid', nullable: true }) oldTargetRequirementId!: string | null;
    @ApiProperty({ example: 'NFR-PERF-0001', nullable: true }) oldTargetVisibleKey!: string | null;
    @ApiProperty({ format: 'uuid', nullable: true }) newTargetRequirementId!: string | null;
    @ApiProperty({ example: 'NFR-PERF-0002', nullable: true }) newTargetVisibleKey!: string | null;
    @ApiProperty({ format: 'date-time' }) occurredAt!: string;
    @ApiProperty({ nullable: true }) actor!: string | null;
    @ApiProperty({ nullable: true }) reason!: string | null;
}

export class RequirementRevisionLinksResponseDto {
    @ApiProperty({ format: 'uuid' }) requirementId!: string;
    @ApiProperty({ minimum: 1 }) revisionNumber!: number;
    @ApiProperty({ format: 'date-time' }) revisionCreatedAt!: string;
    @ApiProperty({ type: [RequirementLinkResponseDto] }) outgoingLinks!: RequirementLinkResponseDto[];
    @ApiProperty({ type: [RequirementLinkResponseDto] }) incomingLinks!: RequirementLinkResponseDto[];
}

export class RequirementLinkChangesResponseDto {
    @ApiProperty({ format: 'uuid' }) requirementId!: string;
    @ApiProperty({ minimum: 1 }) fromRevision!: number;
    @ApiProperty({ minimum: 1 }) toRevision!: number;
    @ApiProperty({ type: [RequirementLinkResponseDto] }) addedOutgoingLinks!: RequirementLinkResponseDto[];
    @ApiProperty({ type: [RequirementLinkResponseDto] }) removedOutgoingLinks!: RequirementLinkResponseDto[];
    @ApiProperty({ type: [RequirementLinkResponseDto] }) unchangedOutgoingLinks!: RequirementLinkResponseDto[];
    @ApiProperty({ type: [RequirementLinkResponseDto] }) addedIncomingLinks!: RequirementLinkResponseDto[];
    @ApiProperty({ type: [RequirementLinkResponseDto] }) removedIncomingLinks!: RequirementLinkResponseDto[];
    @ApiProperty({ type: [RequirementLinkResponseDto] }) unchangedIncomingLinks!: RequirementLinkResponseDto[];
}
