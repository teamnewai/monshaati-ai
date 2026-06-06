-- ================================================================
-- MONSHAATI AI — White Label Complete Schema
-- ================================================================

-- Extend tenants table with all needed fields
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS description_ar     TEXT,
  ADD COLUMN IF NOT EXISTS description_en     TEXT,
  ADD COLUMN IF NOT EXISTS tagline_ar         TEXT,
  ADD COLUMN IF NOT EXISTS tagline_en         TEXT,
  ADD COLUMN IF NOT EXISTS accent_color       TEXT DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS text_color         TEXT DEFAULT '#1f2937',
  ADD COLUMN IF NOT EXISTS background_color   TEXT DEFAULT '#f9fafb',
  ADD COLUMN IF NOT EXISTS font_family        TEXT DEFAULT 'Noto Sans Arabic',
  ADD COLUMN IF NOT EXISTS custom_css         TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url        TEXT,
  ADD COLUMN IF NOT EXISTS app_name_ar        TEXT,
  ADD COLUMN IF NOT EXISTS app_name_en        TEXT,
  ADD COLUMN IF NOT EXISTS domain_verified    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS domain_verify_token TEXT,
  ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_orgs           INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_users          INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS max_gens_per_month INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS features_enabled   TEXT[] DEFAULT ARRAY['ai_generate','export','billing'],
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_email      TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle      TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS trial_ends_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason  TEXT,
  ADD COLUMN IF NOT EXISTS orgs_count         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS users_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gens_this_month    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_this_month NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes              TEXT;

DROP TRIGGER IF EXISTS upd_tenants ON tenants;
CREATE TRIGGER upd_tenants
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tenant members (who can access this tenant's white-label portal)
CREATE TABLE IF NOT EXISTS tenant_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',  -- owner, admin, member
  invited_by  UUID REFERENCES profiles(id),
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tm_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tm_user   ON tenant_members(user_id);
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "tm_tenant_owner" ON tenant_members FOR ALL
  USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()) OR
    user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-add owner as tenant member on tenant creation
CREATE OR REPLACE FUNCTION handle_new_tenant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO tenant_members (tenant_id, user_id, role, accepted_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_tenant_created ON tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION handle_new_tenant();

-- Tenant domain verification records
CREATE TABLE IF NOT EXISTS tenant_domain_checks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain      TEXT NOT NULL,
  token       TEXT NOT NULL,
  method      TEXT DEFAULT 'CNAME',  -- CNAME, TXT
  status      TEXT DEFAULT 'pending', -- pending, verified, failed
  last_check  TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE tenant_domain_checks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "tdc_owner" ON tenant_domain_checks FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant feature flags (what features this tenant's clients can access)
CREATE TABLE IF NOT EXISTS tenant_features (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature    TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config     JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, feature)
);
ALTER TABLE tenant_features ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "tf_owner" ON tenant_features FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant activity log
CREATE TABLE IF NOT EXISTS tenant_activity (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ta_tenant ON tenant_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ta_created ON tenant_activity(created_at DESC);
ALTER TABLE tenant_activity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "ta_owner" ON tenant_activity FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant monthly stats snapshots
CREATE TABLE IF NOT EXISTS tenant_stats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_year     INTEGER NOT NULL,
  period_month    INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  orgs_count      INTEGER DEFAULT 0,
  users_count     INTEGER DEFAULT 0,
  gens_count      INTEGER DEFAULT 0,
  revenue_usd     NUMERIC(12,2) DEFAULT 0,
  active_orgs     INTEGER DEFAULT 0,
  new_signups     INTEGER DEFAULT 0,
  churn_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, period_year, period_month)
);
ALTER TABLE tenant_stats ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "ts_owner" ON tenant_stats FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Super admin: all tenants visible
DO $$ BEGIN
  CREATE POLICY "tenants_admin_all" ON tenants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tm_admin" ON tenant_members FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ta_admin" ON tenant_activity FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ts_admin" ON tenant_stats FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper function: get tenant from domain or slug
CREATE OR REPLACE FUNCTION get_tenant_by_slug(p_slug TEXT)
RETURNS TABLE(id UUID, name TEXT, primary_color TEXT, secondary_color TEXT, logo_url TEXT,
              app_name_ar TEXT, is_active BOOLEAN)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name, primary_color, secondary_color, logo_url, app_name_ar, is_active
  FROM tenants WHERE slug = p_slug AND is_active = TRUE;
$$;

-- Update org stats trigger
CREATE OR REPLACE FUNCTION update_tenant_org_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    UPDATE tenants SET orgs_count = (
      SELECT COUNT(*) FROM organizations WHERE tenant_id = NEW.tenant_id
    ) WHERE id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_org_tenant_update ON organizations;
CREATE TRIGGER on_org_tenant_update
  AFTER INSERT OR UPDATE OF tenant_id ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_tenant_org_count();

