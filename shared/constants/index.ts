// shared/constants/index.ts
// Centralized constants used across NestJS, Next.js, Worker, and Svelte services.

// --- Socket.io Event Names ---
export const SocketEvents = {
  // Client → Server
  SEND_MESSAGE: 'sendMessage',
  JOIN_CONVERSATION: 'joinConversation',
  TYPING_INDICATOR: 'typingIndicator',
  HANDOFF_REQUEST: 'handoffRequest',
  JOIN_AGENT_ROOM: 'joinAgentRoom',
  AGENT_REPLY: 'agentReply',

  // Server → Client
  NEW_MESSAGE: 'newMessage',
  MESSAGE_CHUNK: 'messageChunk',
  TYPING: 'typing',
  AGENT_JOINED: 'agentJoined',
  HANDOFF_REQUESTED: 'handoffRequested',
  AGENT_MESSAGE: 'agentMessage',
  NEW_INBOX_ITEM: 'newInboxItem',
  CONVERSATION_UPDATED: 'conversationUpdated',
  ERROR: 'error',
} as const;

// --- BullMQ Queue Names ---
export const QueueNames = {
  DOCUMENT_PROCESSING: 'document-processing',
  WEBHOOK_RETRIES: 'webhook-retries',
} as const;

// --- User Roles ---
export const UserRoles = {
  USER: 'user',
  ADMIN: 'admin',
  AGENT: 'agent',
  SUPER_ADMIN: 'super_admin',
} as const;

// --- Conversation Statuses ---
export const ConversationStatuses = {
  BOT: 'bot',
  PENDING_AGENT: 'pending_agent',
  AGENT: 'agent',
  CLOSED: 'closed',
} as const;

// --- Error Codes ---
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
} as const;

// --- Allowed File Types for Knowledge Base ---
export const AllowedFileTypes = {
  MIME_TYPES: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ] as const,
  EXTENSIONS: ['.pdf', '.txt', '.md', '.docx'] as const,
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
} as const;

// --- AI Configuration Defaults ---
export const AiDefaults = {
  RAG_TOP_K: 5,
  RAG_MAX_TOKENS: 1024,
  HANDOFF_SIMILARITY_THRESHOLD: 0.3,
  DEFAULT_CHAT_MODEL: 'gpt-4o-mini',
  DEFAULT_EMBEDDING_MODEL: 'text-embedding-3-small',
} as const;
