import { ApiProperty } from '@nestjs/swagger';

export class ExportFormatCapabilitiesDto {
    @ApiProperty() allProjects!: boolean;
    @ApiProperty() project!: boolean;
    @ApiProperty() requirementSelection!: boolean;
    @ApiProperty() importRoundTripReady!: boolean;
    @ApiProperty() renderedMetrics!: boolean;
    @ApiProperty() originalMetricPlaceholders!: boolean;
    @ApiProperty() revisionHistory!: boolean;
    @ApiProperty() linkHistory!: boolean;
}

export class ExportFormatResponseDto {
    @ApiProperty({ example: 'json' }) id!: string;
    @ApiProperty({ example: 'JSON' }) label!: string;
    @ApiProperty({ example: 'json' }) fileExtension!: string;
    @ApiProperty({ example: 'application/json' }) mediaType!: string;
    @ApiProperty({ enum: ['data', 'document'], example: 'data' }) formatClass!: 'data' | 'document';
    @ApiProperty({ type: ExportFormatCapabilitiesDto }) capabilities!: ExportFormatCapabilitiesDto;
}
