import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  chatbots,
  chatbotAgents,
  agents,
  knowledgeBases,
  users,
} from '../database/schema';
import { eq, and } from 'drizzle-orm';
import {
  CreateChatbotDto,
  UpdateChatbotDto,
  AssignAgentToChatbotDto,
} from './dto/chatbots.dto';

@Injectable()
export class ChatbotsService {
  constructor(private readonly db: DatabaseService) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateChatbotDto) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [chatbot] = await tx
        .insert(chatbots)
        .values({
          tenantId,
          name: dto.name,
          domain: dto.domain ?? null,
          knowledgeBaseId: dto.knowledgeBaseId ?? null,
          brandingConfig: dto.brandingConfig ?? {},
        })
        .returning();
      return chatbot;
    });
  }

  async list(tenantId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      // Fetch chatbots with their associated knowledge base name
      const rows = await tx
        .select({
          id: chatbots.id,
          tenantId: chatbots.tenantId,
          name: chatbots.name,
          domain: chatbots.domain,
          knowledgeBaseId: chatbots.knowledgeBaseId,
          knowledgeBaseName: knowledgeBases.name,
          brandingConfig: chatbots.brandingConfig,
          isActive: chatbots.isActive,
          createdAt: chatbots.createdAt,
          updatedAt: chatbots.updatedAt,
        })
        .from(chatbots)
        .leftJoin(knowledgeBases, eq(chatbots.knowledgeBaseId, knowledgeBases.id))
        .where(eq(chatbots.tenantId, tenantId));

      return rows;
    });
  }

  async getOne(tenantId: string, chatbotId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [row] = await tx
        .select({
          id: chatbots.id,
          tenantId: chatbots.tenantId,
          name: chatbots.name,
          domain: chatbots.domain,
          knowledgeBaseId: chatbots.knowledgeBaseId,
          knowledgeBaseName: knowledgeBases.name,
          brandingConfig: chatbots.brandingConfig,
          isActive: chatbots.isActive,
          createdAt: chatbots.createdAt,
          updatedAt: chatbots.updatedAt,
        })
        .from(chatbots)
        .leftJoin(knowledgeBases, eq(chatbots.knowledgeBaseId, knowledgeBases.id))
        .where(and(eq(chatbots.id, chatbotId), eq(chatbots.tenantId, tenantId)));

      if (!row) {
        throw new NotFoundException(`Chatbot ${chatbotId} not found`);
      }
      return row;
    });
  }

  async update(tenantId: string, chatbotId: string, dto: UpdateChatbotDto) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: chatbots.id })
        .from(chatbots)
        .where(and(eq(chatbots.id, chatbotId), eq(chatbots.tenantId, tenantId)));

      if (!existing) {
        throw new NotFoundException(`Chatbot ${chatbotId} not found`);
      }

      const updateData: Partial<typeof chatbots.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.domain !== undefined) updateData.domain = dto.domain;
      if ('knowledgeBaseId' in dto) updateData.knowledgeBaseId = dto.knowledgeBaseId ?? null;
      if (dto.brandingConfig !== undefined) updateData.brandingConfig = dto.brandingConfig;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      const [updated] = await tx
        .update(chatbots)
        .set(updateData)
        .where(eq(chatbots.id, chatbotId))
        .returning();

      return updated;
    });
  }

  async remove(tenantId: string, chatbotId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: chatbots.id })
        .from(chatbots)
        .where(and(eq(chatbots.id, chatbotId), eq(chatbots.tenantId, tenantId)));

      if (!existing) {
        throw new NotFoundException(`Chatbot ${chatbotId} not found`);
      }

      await tx.delete(chatbots).where(eq(chatbots.id, chatbotId));
      return { deleted: chatbotId };
    });
  }

  // ─── Agent Assignments ────────────────────────────────────────────────────

  async listAssignedAgents(tenantId: string, chatbotId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      // Verify chatbot belongs to tenant
      const [chatbot] = await tx
        .select({ id: chatbots.id })
        .from(chatbots)
        .where(and(eq(chatbots.id, chatbotId), eq(chatbots.tenantId, tenantId)));

      if (!chatbot) {
        throw new NotFoundException(`Chatbot ${chatbotId} not found`);
      }

      return tx
        .select({
          assignmentId: chatbotAgents.id,
          agentId: agents.id,
          userId: agents.userId,
          status: agents.status,
          email: users.email,
          createdAt: chatbotAgents.createdAt,
        })
        .from(chatbotAgents)
        .innerJoin(agents, eq(chatbotAgents.agentId, agents.id))
        .innerJoin(users, eq(agents.userId, users.id))
        .where(
          and(
            eq(chatbotAgents.chatbotId, chatbotId),
            eq(chatbotAgents.tenantId, tenantId),
          ),
        );
    });
  }

  async assignAgent(tenantId: string, chatbotId: string, dto: AssignAgentToChatbotDto) {
    return this.db.withTenant(tenantId, async (tx) => {
      // Verify chatbot belongs to tenant
      const [chatbot] = await tx
        .select({ id: chatbots.id })
        .from(chatbots)
        .where(and(eq(chatbots.id, chatbotId), eq(chatbots.tenantId, tenantId)));

      if (!chatbot) {
        throw new NotFoundException(`Chatbot ${chatbotId} not found`);
      }

      // Verify agent belongs to tenant
      const [agent] = await tx
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, dto.agentId), eq(agents.tenantId, tenantId)));

      if (!agent) {
        throw new NotFoundException(`Agent ${dto.agentId} not found`);
      }

      // Check for existing assignment (avoid duplicate key error)
      const [existing] = await tx
        .select({ id: chatbotAgents.id })
        .from(chatbotAgents)
        .where(
          and(
            eq(chatbotAgents.chatbotId, chatbotId),
            eq(chatbotAgents.agentId, dto.agentId),
          ),
        );

      if (existing) {
        throw new ConflictException('Agent is already assigned to this chatbot');
      }

      const [assignment] = await tx
        .insert(chatbotAgents)
        .values({
          tenantId,
          chatbotId,
          agentId: dto.agentId,
        })
        .returning();

      return assignment;
    });
  }

  async unassignAgent(tenantId: string, chatbotId: string, agentId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: chatbotAgents.id })
        .from(chatbotAgents)
        .where(
          and(
            eq(chatbotAgents.chatbotId, chatbotId),
            eq(chatbotAgents.agentId, agentId),
            eq(chatbotAgents.tenantId, tenantId),
          ),
        );

      if (!existing) {
        throw new NotFoundException('Agent assignment not found');
      }

      await tx.delete(chatbotAgents).where(eq(chatbotAgents.id, existing.id));
      return { unassigned: agentId };
    });
  }

  /**
   * Resolve the knowledge base ID for a given chatbot (used by the chat gateway).
   * Returns null if chatbot is not found or has no KB assigned.
   */
  async resolveKnowledgeBaseId(tenantId: string, chatbotId: string): Promise<string | null> {
    return this.db.withTenant(tenantId, async (tx) => {
      const [row] = await tx
        .select({ knowledgeBaseId: chatbots.knowledgeBaseId })
        .from(chatbots)
        .where(and(eq(chatbots.id, chatbotId), eq(chatbots.tenantId, tenantId)));

      return row?.knowledgeBaseId ?? null;
    });
  }
}
