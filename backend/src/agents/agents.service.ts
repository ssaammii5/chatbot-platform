import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { agents, conversations, messages, users } from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  UpdateAgentStatusDto,
  CreateCannedResponseDto,
  AssignAgentDto,
  InternalNoteDto,
} from './dto/agents.dto';

// In-memory canned responses store per tenant (persistent storage can be added via a DB table later)
const cannedResponsesStore = new Map<string, Map<string, { shortcut: string; content: string }>>();

// In-memory internal notes store per conversation (can be moved to DB)
const internalNotesStore = new Map<string, { note: string; agentId: string; createdAt: Date }[]>();

@Injectable()
export class AgentsService {
  constructor(private readonly db: DatabaseService) {}

  /** Get the agent profile for the calling user. */
  async getMyProfile(tenantId: string, userId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [agent] = await tx
        .select()
        .from(agents)
        .where(and(eq(agents.tenantId, tenantId), eq(agents.userId, userId)));

      if (!agent) {
        throw new NotFoundException('Agent profile not found for this user');
      }
      return agent;
    });
  }

  /** List all agents for a tenant (admin view). */
  async listAgents(tenantId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      return tx
        .select({
          id: agents.id,
          userId: agents.userId,
          status: agents.status,
          email: users.email,
          role: users.role,
          createdAt: agents.createdAt,
        })
        .from(agents)
        .innerJoin(users, eq(agents.userId, users.id))
        .where(eq(agents.tenantId, tenantId));
    });
  }

  /** Update the presence/availability status of the calling agent. */
  async updateStatus(tenantId: string, userId: string, dto: UpdateAgentStatusDto) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [agent] = await tx
        .select()
        .from(agents)
        .where(and(eq(agents.tenantId, tenantId), eq(agents.userId, userId)));

      if (!agent) {
        throw new NotFoundException('Agent profile not found');
      }

      const [updated] = await tx
        .update(agents)
        .set({ status: dto.status })
        .where(eq(agents.id, agent.id))
        .returning();

      return updated;
    });
  }

  /** Get the agent's current conversation inbox (assigned or pending). */
  async getInbox(tenantId: string, userId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [agent] = await tx
        .select()
        .from(agents)
        .where(and(eq(agents.tenantId, tenantId), eq(agents.userId, userId)));

      if (!agent) {
        throw new NotFoundException('Agent profile not found');
      }

      // Return conversations that are either pending or assigned to this agent
      const pendingConversations = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.tenantId, tenantId),
            eq(conversations.status, 'pending_agent'),
          ),
        )
        .orderBy(desc(conversations.updatedAt));

      const assignedConversations = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.tenantId, tenantId),
            eq(conversations.assignedAgentId, agent.id),
            eq(conversations.status, 'agent'),
          ),
        )
        .orderBy(desc(conversations.updatedAt));

      return { pending: pendingConversations, assigned: assignedConversations };
    });
  }

  /** Assign a conversation to a specific agent. */
  async assignConversation(tenantId: string, dto: AssignAgentDto) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [conversation] = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, dto.conversationId),
            eq(conversations.tenantId, tenantId),
          ),
        );

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const [updated] = await tx
        .update(conversations)
        .set({ assignedAgentId: dto.agentId, status: 'agent', updatedAt: new Date() })
        .where(eq(conversations.id, dto.conversationId))
        .returning();

      return updated;
    });
  }

  /** Get the full message history for a conversation (agent view). */
  async getConversationHistory(
    tenantId: string,
    conversationId: string,
  ) {
    return this.db.withTenant(tenantId, async (tx) => {
      const msgs = await tx
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);
      return msgs;
    });
  }

  // ─── Canned Responses ────────────────────────────────────────────────────────

  /** List all canned responses for a tenant. */
  listCannedResponses(tenantId: string) {
    const tenantMap = cannedResponsesStore.get(tenantId);
    if (!tenantMap) return [];
    return Array.from(tenantMap.values());
  }

  /** Create or update a canned response by shortcut. */
  upsertCannedResponse(tenantId: string, dto: CreateCannedResponseDto) {
    if (!cannedResponsesStore.has(tenantId)) {
      cannedResponsesStore.set(tenantId, new Map());
    }
    cannedResponsesStore.get(tenantId)!.set(dto.shortcut, dto);
    return dto;
  }

  /** Delete a canned response by shortcut key. */
  deleteCannedResponse(tenantId: string, shortcut: string) {
    const tenantMap = cannedResponsesStore.get(tenantId);
    if (!tenantMap || !tenantMap.has(shortcut)) {
      throw new NotFoundException(`Canned response "${shortcut}" not found`);
    }
    tenantMap.delete(shortcut);
    return { deleted: shortcut };
  }

  // ─── Internal Notes ──────────────────────────────────────────────────────────

  /** Add an internal (agent-only) note to a conversation. Never shown to end-users. */
  addInternalNote(tenantId: string, agentId: string, dto: InternalNoteDto) {
    const key = `${tenantId}:${dto.conversationId}`;
    if (!internalNotesStore.has(key)) {
      internalNotesStore.set(key, []);
    }
    const noteEntry = { note: dto.note, agentId, createdAt: new Date() };
    internalNotesStore.get(key)!.push(noteEntry);
    return noteEntry;
  }

  /** List all internal notes for a conversation (agents only). */
  getInternalNotes(tenantId: string, conversationId: string) {
    const key = `${tenantId}:${conversationId}`;
    return internalNotesStore.get(key) ?? [];
  }
}
