// ============================================================
// Shared Constants — BullMQ Queue Names
// ============================================================

export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
  EMAIL_NOTIFICATIONS: 'email-notifications',
  WEBHOOK_RETRIES: 'webhook-retries',
  USAGE_REPORTING: 'usage-reporting',
  EMBEDDING_GENERATION: 'embedding-generation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
