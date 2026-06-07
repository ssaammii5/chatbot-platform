
import { pgEnum, pgTable, timestamp, uuid, varchar, jsonb } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum('user_role', ['user', 'agent', 'supervisor', 'admin', 'super_admin']);

export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255}).notNull(),
    domain: varchar('domain', {length: 255}).unique(),
    brandingConfig: jsonb('branding_config').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
}

)