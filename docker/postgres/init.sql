-- docker/postgres/init.sql
-- ============================================
-- This script runs on first database initialization.
-- It enables required extensions and sets up RLS policies.
--
-- IMPORTANT: The actual table creation is managed by Drizzle ORM migrations.
-- This script should be run AFTER Drizzle migrations have created the tables.
-- For Docker init, we wrap policy creation in a DO block that checks for table existence.
-- ============================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Enable RLS and create policies (idempotent, only if tables exist)
-- These tables are created by Drizzle migrations via `drizzle-kit push` or `drizzle-kit migrate`.
-- We use a DO block to safely apply policies only when tables are present.

DO $$
BEGIN
  -- Enable RLS on tenant-scoped tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_bases') THEN
    ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
    ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 3. Create the isolation policy for each table
-- The `TRUE` parameter in current_setting ensures it returns NULL instead of crashing if the variable isn't set.

DO $$
BEGIN
  -- Tenant isolation policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_users') THEN
    CREATE POLICY tenant_isolation_users ON users
      AS PERMISSIVE FOR ALL TO PUBLIC
      USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_bases')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_kb') THEN
    CREATE POLICY tenant_isolation_kb ON knowledge_bases
      AS PERMISSIVE FOR ALL TO PUBLIC
      USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_docs') THEN
    CREATE POLICY tenant_isolation_docs ON documents
      AS PERMISSIVE FOR ALL TO PUBLIC
      USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_convos') THEN
    CREATE POLICY tenant_isolation_convos ON conversations
      AS PERMISSIVE FOR ALL TO PUBLIC
      USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_msgs') THEN
    CREATE POLICY tenant_isolation_msgs ON messages
      AS PERMISSIVE FOR ALL TO PUBLIC
      USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_agents') THEN
    CREATE POLICY tenant_isolation_agents ON agents
      AS PERMISSIVE FOR ALL TO PUBLIC
      USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;

  -- 4. Super-admin bypass policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'super_admin_bypass_users') THEN
    CREATE POLICY super_admin_bypass_users ON users AS PERMISSIVE FOR ALL TO PUBLIC
      USING (current_setting('app.is_super_admin', TRUE) = 'true');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_bases')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'super_admin_bypass_kb') THEN
    CREATE POLICY super_admin_bypass_kb ON knowledge_bases AS PERMISSIVE FOR ALL TO PUBLIC
      USING (current_setting('app.is_super_admin', TRUE) = 'true');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'super_admin_bypass_docs') THEN
    CREATE POLICY super_admin_bypass_docs ON documents AS PERMISSIVE FOR ALL TO PUBLIC
      USING (current_setting('app.is_super_admin', TRUE) = 'true');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'super_admin_bypass_convos') THEN
    CREATE POLICY super_admin_bypass_convos ON conversations AS PERMISSIVE FOR ALL TO PUBLIC
      USING (current_setting('app.is_super_admin', TRUE) = 'true');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'super_admin_bypass_msgs') THEN
    CREATE POLICY super_admin_bypass_msgs ON messages AS PERMISSIVE FOR ALL TO PUBLIC
      USING (current_setting('app.is_super_admin', TRUE) = 'true');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'super_admin_bypass_agents') THEN
    CREATE POLICY super_admin_bypass_agents ON agents AS PERMISSIVE FOR ALL TO PUBLIC
      USING (current_setting('app.is_super_admin', TRUE) = 'true');
  END IF;
END $$;
