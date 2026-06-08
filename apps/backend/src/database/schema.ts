import { pgTable, uuid, varchar, timestamp, text, boolean, integer, unique, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'suspended', 'trial_expired']);
export const userRoleEnum = pgEnum('user_role', ['user', 'agent', 'supervisor', 'admin', 'super_admin']);

export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    domain: varchar('domain', { length: 255 }).unique(),
    status: tenantStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


export const globalUsers = pgTable('global_users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    isEmailVerified: boolean('is_email_verified').default(false).notNull(),
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    lockedUntil: timestamp('locked_until'),

    mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
    mfaSecret: text('mfa_secret'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


export const tenantMemberships = pgTable('tenant_memberships', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    globalUserId: uuid('global_user_id')
        .notNull()
        .references(() => globalUsers.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull().default('user'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    uniqMember: unique('tenant_memberships_tenant_user_unique').on(t.tenantId, t.globalUserId),
}));


export const authSessions = pgTable('auth_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    globalUserId: uuid('global_user_id')
        .notNull()
        .references(() => globalUsers.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const tenantsRelations = relations(tenants, ({ many }) => ({
    memberships: many(tenantMemberships),
    sessions: many(authSessions),
}));

export const globalUsersRelations = relations(globalUsers, ({ many }) => ({
    memberships: many(tenantMemberships),
    sessions: many(authSessions),
}));

export const tenantMembershipsRelations = relations(tenantMemberships, ({ one }) => ({
    tenant: one(tenants, { fields: [tenantMemberships.tenantId], references: [tenants.id] }),
    globalUser: one(globalUsers, { fields: [tenantMemberships.globalUserId], references: [globalUsers.id] }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
    tenant: one(tenants, { fields: [authSessions.tenantId], references: [tenants.id] }),
    globalUser: one(globalUsers, { fields: [authSessions.globalUserId], references: [globalUsers.id] }),
}));

