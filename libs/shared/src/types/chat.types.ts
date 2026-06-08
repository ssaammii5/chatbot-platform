// ============================================================
// Shared Types — Chat
// ============================================================

export type MessageRole = 'user' | 'assistant' | 'system';
export type SessionStatus = 'active' | 'waiting_handoff' | 'with_agent' | 'closed';

export interface ChatMessage {
  id: string;
  sessionId: string;
  tenantId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  tenantId: string;
  userId?: string;
  status: SessionStatus;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HandoffRequest {
  sessionId: string;
  tenantId: string;
  reason: string;
  transcript: ChatMessage[];
  requestedAt: Date;
}
