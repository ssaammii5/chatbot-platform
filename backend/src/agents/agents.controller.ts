import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import {
  UpdateAgentStatusDto,
  CreateCannedResponseDto,
  InternalNoteDto,
  AssignAgentDto,
} from './dto/agents.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // ─── Agent Profile & Status ────────────────────────────────────────────────

  @Get('me')
  @Roles('agent', 'admin')
  @ApiOperation({ summary: 'Get my agent profile' })
  async getMyProfile(@Req() req: any) {
    return this.agentsService.getMyProfile(req.user.tenantId, req.user.userId);
  }

  @Get()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'List all agents for the tenant (admin only)' })
  async listAgents(@Req() req: any) {
    return this.agentsService.listAgents(req.user.tenantId);
  }

  @Put('me/status')
  @Roles('agent', 'admin')
  @ApiOperation({ summary: 'Update my availability status (online/offline/busy)' })
  async updateStatus(@Req() req: any, @Body() dto: UpdateAgentStatusDto) {
    return this.agentsService.updateStatus(req.user.tenantId, req.user.userId, dto);
  }

  // ─── Inbox ────────────────────────────────────────────────────────────────

  @Get('inbox')
  @Roles('agent', 'admin')
  @ApiOperation({ summary: 'Get agent inbox — pending and assigned conversations' })
  async getInbox(@Req() req: any) {
    return this.agentsService.getInbox(req.user.tenantId, req.user.userId);
  }

  @Post('assign')
  @Roles('admin', 'agent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a conversation to an agent' })
  async assignConversation(@Req() req: any, @Body() dto: AssignAgentDto) {
    return this.agentsService.assignConversation(req.user.tenantId, dto);
  }

  @Get('conversations/:conversationId/history')
  @Roles('agent', 'admin')
  @ApiOperation({ summary: 'Get full message history for a conversation' })
  async getConversationHistory(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
  ) {
    return this.agentsService.getConversationHistory(
      req.user.tenantId,
      conversationId,
    );
  }

  // ─── Canned Responses ─────────────────────────────────────────────────────

  @Get('canned-responses')
  @Roles('agent', 'admin')
  @ApiOperation({ summary: 'List all canned responses for this tenant' })
  async listCannedResponses(@Req() req: any) {
    return this.agentsService.listCannedResponses(req.user.tenantId);
  }

  @Post('canned-responses')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update a canned response (admin only)' })
  async upsertCannedResponse(@Req() req: any, @Body() dto: CreateCannedResponseDto) {
    return this.agentsService.upsertCannedResponse(req.user.tenantId, dto);
  }

  @Delete('canned-responses/:shortcut')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a canned response by shortcut (admin only)' })
  async deleteCannedResponse(@Req() req: any, @Param('shortcut') shortcut: string) {
    return this.agentsService.deleteCannedResponse(req.user.tenantId, shortcut);
  }

  // ─── Internal Notes ───────────────────────────────────────────────────────

  @Post('conversations/:conversationId/notes')
  @Roles('agent', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an internal note to a conversation (agents only — never sent to end-users)' })
  async addInternalNote(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: InternalNoteDto,
  ) {
    return this.agentsService.addInternalNote(
      req.user.tenantId,
      req.user.userId,
      { ...dto, conversationId },
    );
  }

  @Get('conversations/:conversationId/notes')
  @Roles('agent', 'admin')
  @ApiOperation({ summary: 'Get internal notes for a conversation' })
  async getInternalNotes(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
  ) {
    return this.agentsService.getInternalNotes(req.user.tenantId, conversationId);
  }
}
