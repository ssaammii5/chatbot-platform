#!/usr/bin/env ts-node
/**
 * scripts/seed.ts
 * Seeds the database with a super-admin tenant, a demo tenant, and a demo user.
 * Run with: npx ts-node scripts/seed.ts
 *
 * Prerequisites:
 *   - Docker services running (docker compose up -d postgres)
 *   - Schema migrated (./scripts/migrate.sh)
 *   - .env file present with correct DB credentials
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Inline schema imports since we're running from scripts/
import { tenants, users } from './database/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('🌱 Starting database seed...\n');

  try {
    // =====================
    // 1. Super-Admin Tenant
    // =====================
    const platformTenantName = 'Platform';
    let [platformTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.name, platformTenantName));

    if (!platformTenant) {
      [platformTenant] = await db
        .insert(tenants)
        .values({
          name: platformTenantName,
          domain: 'platform.local',
          brandingConfig: { primaryColor: '#3b82f6', appName: 'AuraChat Admin' },
        })
        .returning();
      console.log(`✅ Created platform tenant: ${platformTenant.id}`);
    } else {
      console.log(`ℹ️  Platform tenant already exists: ${platformTenant.id}`);
    }

    // Super-admin user
    const superAdminEmail = 'superadmin@platform.local';
    const [existingSuperAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, superAdminEmail));

    if (!existingSuperAdmin) {
      const passwordHash = await argon2.hash('SuperAdmin123!');
      const [superAdmin] = await db
        .insert(users)
        .values({
          tenantId: platformTenant.id,
          email: superAdminEmail,
          passwordHash,
          role: 'super_admin',
        })
        .returning();
      console.log(`✅ Created super-admin user: ${superAdmin.email}`);
      console.log(`   Tenant ID: ${platformTenant.id}`);
      console.log(`   Email:     ${superAdminEmail}`);
      console.log(`   Password:  SuperAdmin123!  ← CHANGE IN PRODUCTION\n`);
    } else {
      console.log(`ℹ️  Super-admin already exists: ${superAdminEmail}\n`);
    }

    // =====================
    // 2. Demo Tenant
    // =====================
    const demoTenantName = 'Acme Corp (Demo)';
    let [demoTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.name, demoTenantName));

    if (!demoTenant) {
      [demoTenant] = await db
        .insert(tenants)
        .values({
          name: demoTenantName,
          domain: 'demo.platform.local',
          brandingConfig: { primaryColor: '#10b981', appName: 'Acme Support' },
        })
        .returning();
      console.log(`✅ Created demo tenant: ${demoTenant.id}`);
    } else {
      console.log(`ℹ️  Demo tenant already exists: ${demoTenant.id}`);
    }

    // Demo admin user
    const demoAdminEmail = 'admin@acme.demo';
    const [existingDemoAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, demoAdminEmail));

    if (!existingDemoAdmin) {
      const passwordHash = await argon2.hash('DemoAdmin123!');
      const [demoAdmin] = await db
        .insert(users)
        .values({
          tenantId: demoTenant.id,
          email: demoAdminEmail,
          passwordHash,
          role: 'admin',
        })
        .returning();
      console.log(`✅ Created demo admin: ${demoAdmin.email}`);
      console.log(`   Tenant ID: ${demoTenant.id}`);
      console.log(`   Email:     ${demoAdminEmail}`);
      console.log(`   Password:  DemoAdmin123!  ← CHANGE IN PRODUCTION\n`);
    } else {
      console.log(`ℹ️  Demo admin already exists: ${demoAdminEmail}\n`);
    }

    // Demo agent user
    const demoAgentEmail = 'agent@acme.demo';
    const [existingAgent] = await db
      .select()
      .from(users)
      .where(eq(users.email, demoAgentEmail));

    if (!existingAgent) {
      const passwordHash = await argon2.hash('DemoAgent123!');
      const [agent] = await db
        .insert(users)
        .values({
          tenantId: demoTenant.id,
          email: demoAgentEmail,
          passwordHash,
          role: 'agent',
        })
        .returning();
      console.log(`✅ Created demo agent: ${agent.email}`);
      console.log(`   Password: DemoAgent123!  ← CHANGE IN PRODUCTION\n`);
    }

    // Demo supervisor user
    const demoSupervisorEmail = 'supervisor@acme.demo';
    const [existingSupervisor] = await db
      .select()
      .from(users)
      .where(eq(users.email, demoSupervisorEmail));

    if (!existingSupervisor) {
      const passwordHash = await argon2.hash('DemoSupervisor123!');
      const [supervisor] = await db
        .insert(users)
        .values({
          tenantId: demoTenant.id,
          email: demoSupervisorEmail,
          passwordHash,
          role: 'supervisor',
        })
        .returning();
      console.log(`✅ Created demo supervisor: ${supervisor.email}`);
      console.log(`   Password: DemoSupervisor123!  ← CHANGE IN PRODUCTION\n`);
    }

    console.log('🎉 Seed complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Quick Start Credentials');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Super Admin:  ${superAdminEmail} / SuperAdmin123!`);
    console.log(`Demo Admin:   ${demoAdminEmail} / DemoAdmin123!`);
    console.log(`Demo Agent:   ${demoAgentEmail} / DemoAgent123!`);
    console.log(`Demo Superv:  ${demoSupervisorEmail} / DemoSupervisor123!`);
    console.log(`Demo Tenant:  ${demoTenant.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
