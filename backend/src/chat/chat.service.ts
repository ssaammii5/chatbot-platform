// backend/src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { conversations, messages } from '../database/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class ChatService {
  constructor(private readonly dbService: DatabaseService) {}

  async ensureConversation(tenantId: string, id: string, endUserId: string, chatbotId?: string | null) {
    return this.dbService.withTenant(tenantId, async (tx) => {
      try {
        await tx.insert(conversations).values({
          id,
          tenantId,
          endUserId,
          status: 'bot',
          ...(chatbotId ? { chatbotId } : {}),
        });
      } catch (e: any) {
        // Ignore unique violation (already exists)
        if (e.code !== '23505') throw e;
      }
    });
  }

  async getConversation(tenantId: string, id: string) {
    return this.dbService.withTenant(tenantId, async (tx) => {
      const result = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.id, id));
      return result[0];
    });
  }

  async updateConversationStatus(
    tenantId: string,
    id: string,
    status: string,
  ) {
    return this.dbService.withTenant(tenantId, async (tx) => {
      await tx
        .update(conversations)
        .set({ status, updatedAt: new Date() })
        .where(eq(conversations.id, id));
    });
  }

  async saveMessage(
    tenantId: string,
    conversationId: string,
    role: string,
    content: string,
  ) {
    return this.dbService.withTenant(tenantId, async (tx) => {
      const result = await tx
        .insert(messages)
        .values({
          tenantId,
          conversationId,
          role,
          content,
        })
        .returning();
      return result[0];
    });
  }

  async listConversations(tenantId: string) {
    return this.dbService.withTenant(tenantId, async (tx) => {
      return tx
        .select()
        .from(conversations)
        .orderBy(desc(conversations.updatedAt));
    });
  }

  async listPendingConversations(tenantId: string) {
    return this.dbService.withTenant(tenantId, async (tx) => {
      return tx
        .select()
        .from(conversations)
        .where(eq(conversations.status, 'pending_agent'))
        .orderBy(desc(conversations.updatedAt));
    });
  }

  async getMessages(tenantId: string, conversationId: string) {
    return this.dbService.withTenant(tenantId, async (tx) => {
      return tx
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId));
    });
  }
}
