import { Controller, Get, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for the tenant' })
  async listConversations(@Req() req: any) {
    return this.chatService.listConversations(req.user.tenantId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'List all messages for a specific conversation' })
  async getMessages(@Req() req: any, @Param('id') conversationId: string) {
    return this.chatService.getMessages(req.user.tenantId, conversationId);
  }

  @Put('conversations/:id/status')
  @ApiOperation({ summary: 'Update the status of a conversation (e.g., closed)' })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { status: string },
  ) {
    await this.chatService.updateConversationStatus(req.user.tenantId, id, dto.status);
    return { success: true };
  }

  @Put('conversations/:id/assign')
  @ApiOperation({ summary: 'Assign an agent to a conversation' })
  async assignAgent(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { agentId: string | null },
  ) {
    await this.chatService.assignAgent(req.user.tenantId, id, dto.agentId);
    return { success: true };
  }
}
