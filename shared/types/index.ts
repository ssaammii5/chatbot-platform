// shared/types/index.ts
// Cross-service type contracts for the multi-tenant chatbot platform.
// These types MUST be updated whenever data models change in any service.

// --- Enums ---

export type UserRole = 'user' | 'admin' | 'agent' | 'super_admin';

export type ConversationStatus = 'bot' | 'pending_agent' | 'agent' | 'closed';

export type AgentStatus = 'online' | 'offline' | 'busy';

export type MessageRole = 'user' | 'bot' | 'agent' | 'system';

// --- Core Models ---

export interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  brandingConfig: Record<string, unknown>;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Agent {
  id: string;
  tenantId: string;
  userId: string;
  status: AgentStatus;
  createdAt: string;
}

export interface KnowledgeBase {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Document {
  id: string;
  tenantId: string;
  knowledgeBaseId: string;
  filename: string;
  fileType: string;
  storagePath: string;
  createdAt: string;
}

// --- Chat Models ---

export interface ChatSession {
  id: string;
  tenantId: string;
  endUserId: string;
  status: ConversationStatus;
  assignedAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  tenantId: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

// --- Analytics ---

export interface TokenUsage {
  id: string;
  tenantId: string;
  conversationId: string | null;
  tokens: number;
  model: string;
  action: string;
  createdAt: string;
}

// --- Auth ---

export interface AuthSession {
  id: string;
  tenantId: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface JwtPayload {
  sub: string;        // user ID
  tenantId: string;
  role: UserRole;
  sessionToken: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  accessToken: string;
  user: Pick<User, 'id' | 'email' | 'role' | 'tenantId'>;
}

// --- Socket Event Payloads ---

export interface SendMessagePayload {
  conversationId: string;
  content: string;
}

export interface NewMessagePayload {
  sender: MessageRole;
  content: string;
  conversationId?: string;
}

export interface MessageChunkPayload {
  chunk: string;
}

export interface HandoffRequestPayload {
  conversationId: string;
}

export interface AgentJoinedPayload {
  agentName: string;
}

export interface NewInboxItemPayload {
  conversationId: string;
  endUserId: string;
  lastMessage: string;
}

export interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

export interface AgentReplyPayload {
  conversationId: string;
  content: string;
}

// --- AI Service Models ---

export interface AiChatRequest {
  tenantId: string;
  query: string;
}

export interface AiChatResponse {
  content: string;
  requiresHandoff: boolean;
  citations?: string[];
  tokensUsed?: number;
}

export interface AiDocumentRequest {
  tenantId: string;
  knowledgeBaseId: string;
  filePath: string;
}
