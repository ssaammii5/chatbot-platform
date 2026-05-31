import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChatbotsService } from './chatbots.service';
import {
  CreateChatbotDto,
  UpdateChatbotDto,
  AssignAgentToChatbotDto,
} from './dto/chatbots.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('chatbots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@Controller('chatbots')
export class ChatbotsController {
  constructor(private readonly chatbotsService: ChatbotsService) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chatbot for this tenant' })
  async create(@Req() req: any, @Body() dto: CreateChatbotDto) {
    return this.chatbotsService.create(req.user.tenantId, dto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all chatbots for this tenant' })
  async list(@Req() req: any) {
    return this.chatbotsService.list(req.user.tenantId);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get a single chatbot with its KB and agent info' })
  @ApiParam({ name: 'id', description: 'Chatbot ID' })
  async getOne(@Req() req: any, @Param('id') id: string) {
    return this.chatbotsService.getOne(req.user.tenantId, id);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update chatbot name, domain, knowledge base, or branding' })
  @ApiParam({ name: 'id', description: 'Chatbot ID' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateChatbotDto,
  ) {
    return this.chatbotsService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a chatbot' })
  @ApiParam({ name: 'id', description: 'Chatbot ID' })
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.chatbotsService.remove(req.user.tenantId, id);
  }

  // ─── Agent Assignments ────────────────────────────────────────────────────

  @Get(':id/agents')
  @Roles('admin')
  @ApiOperation({ summary: 'List agents assigned to a chatbot' })
  @ApiParam({ name: 'id', description: 'Chatbot ID' })
  async listAgents(@Req() req: any, @Param('id') id: string) {
    return this.chatbotsService.listAssignedAgents(req.user.tenantId, id);
  }

  @Post(':id/agents')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign an agent to a chatbot' })
  @ApiParam({ name: 'id', description: 'Chatbot ID' })
  async assignAgent(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AssignAgentToChatbotDto,
  ) {
    return this.chatbotsService.assignAgent(req.user.tenantId, id, dto);
  }

  @Delete(':id/agents/:agentId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unassign an agent from a chatbot' })
  @ApiParam({ name: 'id', description: 'Chatbot ID' })
  @ApiParam({ name: 'agentId', description: 'Agent ID to unassign' })
  async unassignAgent(
    @Req() req: any,
    @Param('id') id: string,
    @Param('agentId') agentId: string,
  ) {
    return this.chatbotsService.unassignAgent(req.user.tenantId, id, agentId);
  }
}
