// ============================================================
// Shared Constants — Error Codes
// ============================================================

export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'AUTH_001',
  FORBIDDEN: 'AUTH_002',
  TOKEN_EXPIRED: 'AUTH_003',
  INVALID_TOKEN: 'AUTH_004',

  // Tenant errors
  TENANT_NOT_FOUND: 'TENANT_001',
  TENANT_INACTIVE: 'TENANT_002',
  TENANT_QUOTA_EXCEEDED: 'TENANT_003',

  // Chat errors
  SESSION_NOT_FOUND: 'CHAT_001',
  SESSION_CLOSED: 'CHAT_002',
  HANDOFF_FAILED: 'CHAT_003',
  NO_AGENT_AVAILABLE: 'CHAT_004',

  // AI service errors
  AI_SERVICE_UNAVAILABLE: 'AI_001',
  AI_RATE_LIMIT: 'AI_002',
  AI_CONTEXT_TOO_LONG: 'AI_003',

  // Knowledge base errors
  DOCUMENT_TOO_LARGE: 'KB_001',
  UNSUPPORTED_FORMAT: 'KB_002',
  PROCESSING_FAILED: 'KB_003',

  // Generic
  VALIDATION_ERROR: 'GEN_001',
  INTERNAL_ERROR: 'GEN_002',
  NOT_FOUND: 'GEN_003',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
