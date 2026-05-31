/**
 * widget/src/socket.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Socket.io client factory for the AI chat widget.
 * Extracted from ChatWidget.svelte to keep the component focused on UI.
 *
 * Usage:
 *   import { createChatSocket, ChatSocket } from './socket';
 *   const socket = createChatSocket({ wsUrl, tenantId, onMessage, onChunk, ... });
 *   socket.connect();
 *   socket.joinConversation(conversationId);
 *   socket.sendMessage(conversationId, content);
 *   socket.disconnect();
 */

import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IncomingMessage {
  sender: string;
  content: string;
}

export interface AgentJoinedEvent {
  agentName: string;
}

export interface ChatSocketOptions {
  /** NestJS WebSocket URL (e.g. http://localhost:3000) */
  wsUrl: string;
  /** Tenant ID passed as a handshake query param */
  tenantId: string;
  /** Fired when a complete message arrives (e.g. from agent or system) */
  onMessage: (msg: IncomingMessage) => void;
  /** Fired for each streamed text chunk from the AI */
  onChunk: (chunk: string) => void;
  /** Fired when a human agent joins the conversation */
  onAgentJoined: (event: AgentJoinedEvent) => void;
  /** Fired when the typing indicator changes */
  onTyping: (isTyping: boolean) => void;
  /** Fired on connect */
  onConnect?: () => void;
  /** Fired on disconnect */
  onDisconnect?: () => void;
  /** Fired on connection error */
  onError?: (err: Error) => void;
}

export interface ChatSocket {
  connect: () => void;
  disconnect: () => void;
  joinConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  requestHandoff: (conversationId: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  joinAgentRoom: () => void;
  replyAsAgent: (conversationId: string, content: string) => void;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a configured Socket.io client for the chat widget.
 * The returned object exposes a clean API so ChatWidget.svelte never
 * touches the raw Socket.io instance.
 */
export function createChatSocket(options: ChatSocketOptions): ChatSocket {
  const {
    wsUrl,
    tenantId,
    onMessage,
    onChunk,
    onAgentJoined,
    onTyping,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  let socket: Socket | null = null;

  function connect() {
    socket = io(wsUrl, {
      query: { tenantId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      onConnect?.();
    });

    socket.on('disconnect', () => {
      onDisconnect?.();
    });

    socket.on('connect_error', (err: Error) => {
      onError?.(err);
    });

    socket.on('newMessage', (msg: IncomingMessage) => {
      onMessage(msg);
    });

    socket.on('messageChunk', (data: { chunk: string }) => {
      onChunk(data.chunk);
    });

    socket.on('agentJoined', (data: AgentJoinedEvent) => {
      onAgentJoined(data);
    });

    socket.on('typing', (data: { isTyping: boolean }) => {
      onTyping(data.isTyping);
    });
  }

  function disconnect() {
    socket?.disconnect();
    socket = null;
  }

  function joinConversation(conversationId: string) {
    socket?.emit('joinConversation', { conversationId });
  }

  function sendMessage(conversationId: string, content: string) {
    socket?.emit('sendMessage', { conversationId, content });
  }

  function requestHandoff(conversationId: string) {
    socket?.emit('handoffRequest', { conversationId });
  }

  function sendTyping(conversationId: string, isTyping: boolean) {
    socket?.emit('typingIndicator', { conversationId, isTyping });
  }

  function joinAgentRoom() {
    socket?.emit('joinAgentRoom');
  }

  function replyAsAgent(conversationId: string, content: string) {
    socket?.emit('agentReply', { conversationId, content });
  }

  return {
    connect,
    disconnect,
    joinConversation,
    sendMessage,
    requestHandoff,
    sendTyping,
    joinAgentRoom,
    replyAsAgent,
  };
}
