// backend/src/database/schema.ts
import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb, integer, unique, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- PLATFORM LEVEL ---
export const userRoleEnum = pgEnum('user_role', ['user', 'agent', 'supervisor', 'admin', 'super_admin']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).unique(),
  brandingConfig: jsonb('branding_config').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- TENANT LEVEL (RLS Enforced in DB) ---

// 1. Users & Auth
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' }), // Nullable for super_admin
  email: varchar('email', { length: 255 }).notNull(),
  // For secure authentication, we must store passwords as memory-hard hashes (e.g., Argon2/scrypt).
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Secure Session management table (per Security Skill)
export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' }), // Nullable for super_admin
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(), // Should store hashed tokens in production
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('offline'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Knowledge Base
export const knowledgeBases = pgTable('knowledge_bases', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2a. Chatbots — one per website/domain, linked to a KB and a set of agents
export const chatbots = pgTable('chatbots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }),
  knowledgeBaseId: uuid('knowledge_base_id')
    .references(() => knowledgeBases.id, { onDelete: 'set null' }),
  brandingConfig: jsonb('branding_config').default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2b. Chatbot ↔ Agent assignment (M:N)
export const chatbotAgents = pgTable('chatbot_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  chatbotId: uuid('chatbot_id')
    .notNull()
    .references(() => chatbots.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqChatbotAgent: unique('chatbot_agents_chatbot_agent_unique').on(t.chatbotId, t.agentId),
}));

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  knowledgeBaseId: uuid('knowledge_base_id')
    .notNull()
    .references(() => knowledgeBases.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  // Path to file in secure storage (S3, etc.). Must not be directly accessible by URL.
  storagePath: text('storage_path').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Chat System
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  // endUserId could be an anonymous session ID from the Svelte widget
  endUserId: varchar('end_user_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('bot'), // 'bot', 'agent', 'closed'
  assignedAgentId: uuid('assigned_agent_id')
    .references(() => agents.id, { onDelete: 'set null' }),
  // nullable — backward compat: conversations without a chatbot use tenant-wide RAG fallback
  chatbotId: uuid('chatbot_id')
    .references(() => chatbots.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // 'user', 'bot', 'agent'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cannedResponses = pgTable('canned_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const internalNotes = pgTable('internal_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Analytics
export const tokenUsage = pgTable('token_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id')
    .references(() => conversations.id, { onDelete: 'set null' }),
  tokens: integer('tokens').notNull(),
  model: varchar('model', { length: 255 }).notNull(),
  action: varchar('action', { length: 255 }).notNull(), // e.g., 'rag_query', 'summarize'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- RELATIONS ---
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  agentProfile: one(agents, { fields: [users.id], references: [agents.userId] }),
  authSessions: many(authSessions),
  internalNotes: many(internalNotes),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [authSessions.tenantId], references: [tenants.id] }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, { fields: [agents.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [agents.tenantId], references: [tenants.id] }),
  conversations: many(conversations),
  chatbotAssignments: many(chatbotAgents),
}));

export const knowledgeBasesRelations = relations(knowledgeBases, ({ one, many }) => ({
  tenant: one(tenants, { fields: [knowledgeBases.tenantId], references: [tenants.id] }),
  documents: many(documents),
  chatbots: many(chatbots),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, { fields: [documents.tenantId], references: [tenants.id] }),
  knowledgeBase: one(knowledgeBases, { fields: [documents.knowledgeBaseId], references: [knowledgeBases.id] }),
}));

export const chatbotsRelations = relations(chatbots, ({ one, many }) => ({
  tenant: one(tenants, { fields: [chatbots.tenantId], references: [tenants.id] }),
  knowledgeBase: one(knowledgeBases, { fields: [chatbots.knowledgeBaseId], references: [knowledgeBases.id] }),
  agentAssignments: many(chatbotAgents),
  conversations: many(conversations),
}));

export const chatbotAgentsRelations = relations(chatbotAgents, ({ one }) => ({
  chatbot: one(chatbots, { fields: [chatbotAgents.chatbotId], references: [chatbots.id] }),
  agent: one(agents, { fields: [chatbotAgents.agentId], references: [agents.id] }),
  tenant: one(tenants, { fields: [chatbotAgents.tenantId], references: [tenants.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [conversations.tenantId], references: [tenants.id] }),
  assignedAgent: one(agents, { fields: [conversations.assignedAgentId], references: [agents.id] }),
  chatbot: one(chatbots, { fields: [conversations.chatbotId], references: [chatbots.id] }),
  messages: many(messages),
  internalNotes: many(internalNotes),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  tenant: one(tenants, { fields: [messages.tenantId], references: [tenants.id] }),
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  tenant: one(tenants, { fields: [tokenUsage.tenantId], references: [tenants.id] }),
  conversation: one(conversations, { fields: [tokenUsage.conversationId], references: [conversations.id] }),
}));

export const cannedResponsesRelations = relations(cannedResponses, ({ one }) => ({
  tenant: one(tenants, { fields: [cannedResponses.tenantId], references: [tenants.id] }),
}));

export const internalNotesRelations = relations(internalNotes, ({ one }) => ({
  tenant: one(tenants, { fields: [internalNotes.tenantId], references: [tenants.id] }),
  conversation: one(conversations, { fields: [internalNotes.conversationId], references: [conversations.id] }),
  author: one(users, { fields: [internalNotes.authorId], references: [users.id] }),
}));
