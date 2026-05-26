import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { AiClientService } from '../ai-client/ai-client.service';
import { ChatbotsService } from '../chatbots/chatbots.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
    ],
    // TODO(security): In production, load allowed origins from tenant domain registry
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly aiClientService: AiClientService,
    private readonly chatbotsService: ChatbotsService,
  ) {}

  async handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    if (!tenantId || typeof tenantId !== 'string' || tenantId.length > 100) {
      client.disconnect();
      return;
    }
    // Join a specific room for this tenant's public interactions
    client.join(`tenant_${tenantId}`);

    // If a chatbotId was provided, join a chatbot-scoped room too
    const chatbotId = client.handshake.query.chatbotId as string | undefined;
    if (chatbotId && typeof chatbotId === 'string' && chatbotId.length <= 100) {
      client.join(`chatbot_${chatbotId}`);
    }

    this.logger.log(`Client connected: ${client.id} to tenant ${tenantId}${chatbotId ? `, chatbot ${chatbotId}` : ''}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    client: Socket,
    payload: { conversationId: string; content: string },
  ) {
    const tenantId = client.handshake.query.tenantId as string;
    const chatbotId = client.handshake.query.chatbotId as string | undefined;
    const endUserId = client.id;

    // Input validation
    if (
      !payload ||
      !payload.conversationId ||
      !payload.content ||
      typeof payload.content !== 'string' ||
      payload.content.length > 5000
    ) {
      client.emit('error', { message: 'Invalid message payload' });
      return;
    }

    const sanitizedContent = payload.content.trim();
    if (!sanitizedContent) {
      return;
    }

    // Ensure the conversation exists (link to chatbot if provided)
    await this.chatService.ensureConversation(
      tenantId,
      payload.conversationId,
      endUserId,
      chatbotId ?? null,
    );

    // Save user message
    await this.chatService.saveMessage(
      tenantId,
      payload.conversationId,
      'user',
      sanitizedContent,
    );

    // Check conversation status
    const convo = await this.chatService.getConversation(
      tenantId,
      payload.conversationId,
    );

    if (convo?.status === 'agent' || convo?.status === 'pending_agent') {
      // If it's an agent conversation, broadcast to the tenant's agent room
      this.server.to(`tenant_${tenantId}_agents`).emit('agentMessage', {
        conversationId: payload.conversationId,
        sender: 'user',
        content: sanitizedContent,
      });
      // Do NOT call AI
      return;
    }

    // Call AI Service with streaming
    try {
      // Resolve knowledge base ID from the chatbot (null = tenant-wide fallback)
      let knowledgeBaseId: string | null = null;
      if (chatbotId) {
        knowledgeBaseId = await this.chatbotsService.resolveKnowledgeBaseId(tenantId, chatbotId);
      }

      const result = await this.aiClientService.queryRagStream(
        tenantId,
        sanitizedContent,
        (chunk) => {
          this.server
            .to(payload.conversationId)
            .emit('messageChunk', { chunk });
        },
        knowledgeBaseId,
      );

      // Check if AI says it can't answer (requires handoff)
      if (result.requiresHandoff) {
        // Update conversation status to pending_agent
        await this.chatService.updateConversationStatus(
          tenantId,
          payload.conversationId,
          'pending_agent',
        );

        // Send fallback message to user
        const fallbackMsg =
          "I wasn't able to find a definitive answer for that. Let me connect you with a human agent who can help.";
        this.server.to(payload.conversationId).emit('newMessage', {
          sender: 'bot',
          content: fallbackMsg,
        });
        await this.chatService.saveMessage(
          tenantId,
          payload.conversationId,
          'bot',
          fallbackMsg,
        );

        // Notify agents in the tenant
        this.server.to(`tenant_${tenantId}_agents`).emit('newInboxItem', {
          conversationId: payload.conversationId,
          endUserId,
          lastMessage: sanitizedContent,
        });
      } else {
        // Save full bot message to database once stream completes
        await this.chatService.saveMessage(
          tenantId,
          payload.conversationId,
          'bot',
          result.fullResponse,
        );
      }
    } catch (err) {
      this.logger.error('AI service error', err);
      this.server.to(payload.conversationId).emit('newMessage', {
        sender: 'bot',
        content:
          'I apologize, but I am having trouble processing your request right now. Would you like to speak with a human agent?',
      });
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    client: Socket,
    payload: { conversationId: string },
  ) {
    if (!payload?.conversationId) return;
    client.join(payload.conversationId);
  }

  @SubscribeMessage('typingIndicator')
  async handleTyping(
    client: Socket,
    payload: { conversationId: string; isTyping: boolean },
  ) {
    if (!payload?.conversationId) return;
    client
      .to(payload.conversationId)
      .emit('typing', { isTyping: payload.isTyping });
  }

  @SubscribeMessage('handoffRequest')
  async handleHandoff(
    client: Socket,
    payload: { conversationId: string },
  ) {
    if (!payload?.conversationId) return;
    const tenantId = client.handshake.query.tenantId as string;

    // Update DB
    await this.chatService.updateConversationStatus(
      tenantId,
      payload.conversationId,
      'pending_agent',
    );

    // Notify user
    this.server.to(payload.conversationId).emit('newMessage', {
      sender: 'system',
      content: 'Please wait while we connect you with a support agent...',
    });

    // Notify agents in the tenant
    this.server.to(`tenant_${tenantId}_agents`).emit('newInboxItem', {
      conversationId: payload.conversationId,
      endUserId: client.id,
      lastMessage: 'User requested to speak with an agent',
    });
  }

  @SubscribeMessage('joinAgentRoom')
  async handleJoinAgentRoom(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    client.join(`tenant_${tenantId}_agents`);
    this.logger.log(`Agent ${client.id} joined agent room for tenant ${tenantId}`);
  }

  @SubscribeMessage('agentReply')
  async handleAgentReply(
    client: Socket,
    payload: { conversationId: string; content: string },
  ) {
    if (!payload?.conversationId || !payload?.content) return;
    const tenantId = client.handshake.query.tenantId as string;
    const sanitizedContent = payload.content.trim();
    if (!sanitizedContent) return;

    // If conversation was pending, mark it as active agent
    const convo = await this.chatService.getConversation(
      tenantId,
      payload.conversationId,
    );
    if (convo?.status === 'pending_agent') {
      await this.chatService.updateConversationStatus(
        tenantId,
        payload.conversationId,
        'agent',
      );
      this.server.to(payload.conversationId).emit('agentJoined', {
        agentName: 'Support Team',
      });
    }

    // Save agent message
    await this.chatService.saveMessage(
      tenantId,
      payload.conversationId,
      'agent',
      sanitizedContent,
    );

    // Emit to the user
    this.server.to(payload.conversationId).emit('newMessage', {
      sender: 'agent',
      content: sanitizedContent,
    });
  }
}
