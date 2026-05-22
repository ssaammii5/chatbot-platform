// backend/src/database/schema.ts
import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- PLATFORM LEVEL ---
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
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  // For secure authentication, we must store passwords as memory-hard hashes (e.g., Argon2/scrypt).
  passwordHash: text('password_hash'),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Secure Session management table (per Security Skill)
export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
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
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [authSessions.tenantId], references: [tenants.id] }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, { fields: [agents.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [agents.tenantId], references: [tenants.id] }),
  conversations: many(conversations),
}));

export const knowledgeBasesRelations = relations(knowledgeBases, ({ one, many }) => ({
  tenant: one(tenants, { fields: [knowledgeBases.tenantId], references: [tenants.id] }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, { fields: [documents.tenantId], references: [tenants.id] }),
  knowledgeBase: one(knowledgeBases, { fields: [documents.knowledgeBaseId], references: [knowledgeBases.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [conversations.tenantId], references: [tenants.id] }),
  assignedAgent: one(agents, { fields: [conversations.assignedAgentId], references: [agents.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  tenant: one(tenants, { fields: [messages.tenantId], references: [tenants.id] }),
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  tenant: one(tenants, { fields: [tokenUsage.tenantId], references: [tenants.id] }),
  conversation: one(conversations, { fields: [tokenUsage.conversationId], references: [conversations.id] }),
}));
