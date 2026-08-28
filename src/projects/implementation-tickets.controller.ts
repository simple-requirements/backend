import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { ImplementationTicketResponseDto, UpsertImplementationTicketDto } from '@/projects/dto/implementation-ticket.dto';
import { implementationTicketSchema } from '@/projects/dto/project.schemas';
import { ProjectsService } from '@/projects/projects.service';

@ApiTags('implementation-tickets')
@Controller('projects/:projectId/requirements/:requirementId/implementation-tickets')
export class ImplementationTicketsController {
    constructor(private readonly projectsService: ProjectsService) {}
    @Get()
    @ApiOperation({ operationId: 'listImplementationTickets', summary: 'List implementation tickets.' })
    @ApiOkResponse({ type: ImplementationTicketResponseDto, isArray: true })
    list(@Param('projectId') projectId: string, @Param('requirementId') requirementId: string) {
        return this.projectsService.listImplementationTickets(projectId, requirementId);
    }
    @Post()
    @ApiOperation({ operationId: 'createImplementationTicket', summary: 'Add an implementation ticket.' })
    @ApiCreatedResponse({ type: ImplementationTicketResponseDto })
    create(@Param('projectId') projectId: string, @Param('requirementId') requirementId: string, @Body(new ZodValidationPipe(implementationTicketSchema)) dto: UpsertImplementationTicketDto) {
        return this.projectsService.createImplementationTicket(projectId, requirementId, dto);
    }
    @Patch(':ticketRecordId')
    @ApiOperation({ operationId: 'updateImplementationTicket', summary: 'Update an implementation ticket.' })
    @ApiOkResponse({ type: ImplementationTicketResponseDto })
    update(@Param('projectId') projectId: string, @Param('requirementId') requirementId: string, @Param('ticketRecordId') ticketRecordId: string, @Body(new ZodValidationPipe(implementationTicketSchema)) dto: UpsertImplementationTicketDto) {
        return this.projectsService.updateImplementationTicket(projectId, requirementId, ticketRecordId, dto);
    }
    @Delete(':ticketRecordId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ operationId: 'deleteImplementationTicket', summary: 'Remove an implementation ticket.' })
    @ApiNoContentResponse()
    async delete(@Param('projectId') projectId: string, @Param('requirementId') requirementId: string, @Param('ticketRecordId') ticketRecordId: string): Promise<void> {
        await this.projectsService.deleteImplementationTicket(projectId, requirementId, ticketRecordId);
    }
}
