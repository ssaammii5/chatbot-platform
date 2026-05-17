CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Basic policy for super admins or bypass
CREATE POLICY super_admin_all ON tenants FOR ALL USING (current_setting('app.is_super_admin', true) = 'true');
