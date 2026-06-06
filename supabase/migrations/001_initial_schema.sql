-- ================================================================
-- MONSHAATI AI — Full Database Schema v1.0
-- Run in Supabase SQL Editor
-- ================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- ENUMS
-- ================================================================
DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM (
    'sole_proprietorship','llc','joint_stock','branch',
    'ngo','government','cooperative','partnership'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE org_size AS ENUM ('1-10','11-50','51-200','201-500','500+');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE generation_status AS ENUM ('pending','generating','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free_trial','starter','business','professional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin','owner','admin','member','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE export_format AS ENUM ('pdf','docx','json','xlsx');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workflow_status AS ENUM ('draft','review','approved','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- TABLE: profiles (extends auth.users)
-- ================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  full_name_ar    TEXT,
  avatar_url      TEXT,
  phone           TEXT,
  role            user_role NOT NULL DEFAULT 'owner',
  preferred_lang  TEXT NOT NULL DEFAULT 'ar',
  timezone        TEXT DEFAULT 'Asia/Riyadh',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: sectors (seed data for Saudi/UAE sectors)
-- ================================================================
CREATE TABLE IF NOT EXISTS sectors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isic_code   TEXT UNIQUE,
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  parent_id   UUID REFERENCES sectors(id),
  level       INTEGER NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0
);

-- ================================================================
-- TABLE: organizations
-- ================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  name_ar             TEXT,
  slug                TEXT UNIQUE,
  entity_type         entity_type NOT NULL,
  sector_id           UUID REFERENCES sectors(id),
  primary_activity    TEXT NOT NULL,
  secondary_activity  TEXT,
  isic_code           TEXT,
  employee_count      org_size NOT NULL,
  country             TEXT NOT NULL DEFAULT 'SA',
  city                TEXT NOT NULL,
  address             TEXT,
  commercial_reg      TEXT,
  tax_number          TEXT,
  website             TEXT,
  phone               TEXT,
  logo_url            TEXT,
  subscription_plan   subscription_plan NOT NULL DEFAULT 'free_trial',
  trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_ends_at TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: organization_members
-- ================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'member',
  invited_by  UUID REFERENCES profiles(id),
  invite_token TEXT UNIQUE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- ================================================================
-- TABLE: ai_generations
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_generations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  status              generation_status NOT NULL DEFAULT 'pending',
  input_data          JSONB NOT NULL DEFAULT '{}',
  result_data         JSONB,
  error_message       TEXT,
  model_used          TEXT DEFAULT 'gpt-4o',
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  total_tokens        INTEGER,
  generation_time_ms  INTEGER,
  version             INTEGER NOT NULL DEFAULT 1,
  is_current          BOOLEAN NOT NULL DEFAULT TRUE,
  language            TEXT NOT NULL DEFAULT 'ar',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

-- ================================================================
-- TABLE: org_chart_nodes
-- ================================================================
CREATE TABLE IF NOT EXISTS org_chart_nodes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id   UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES org_chart_nodes(id) ON DELETE SET NULL,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  department_ar   TEXT,
  department_en   TEXT,
  level           INTEGER NOT NULL DEFAULT 0,
  position_order  INTEGER NOT NULL DEFAULT 0,
  head_count      INTEGER NOT NULL DEFAULT 1,
  isco_code       TEXT,
  onet_code       TEXT,
  is_key_role     BOOLEAN NOT NULL DEFAULT FALSE,
  reports_to_ar   TEXT,
  node_type       TEXT DEFAULT 'role',
  color_hex       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: job_descriptions
-- ================================================================
CREATE TABLE IF NOT EXISTS job_descriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id     UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  node_id           UUID REFERENCES org_chart_nodes(id) ON DELETE SET NULL,
  title_ar          TEXT NOT NULL,
  title_en          TEXT,
  department_ar     TEXT,
  grade             TEXT,
  reports_to_ar     TEXT,
  summary_ar        TEXT,
  summary_en        TEXT,
  responsibilities  JSONB NOT NULL DEFAULT '[]',
  requirements      JSONB NOT NULL DEFAULT '[]',
  competencies      JSONB NOT NULL DEFAULT '[]',
  authorities       JSONB NOT NULL DEFAULT '[]',
  salary_min        NUMERIC,
  salary_max        NUMERIC,
  currency          TEXT NOT NULL DEFAULT 'SAR',
  work_type         TEXT DEFAULT 'full_time',
  experience_years  TEXT,
  education_level   TEXT,
  workflow_status   workflow_status NOT NULL DEFAULT 'draft',
  is_approved       BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by       UUID REFERENCES profiles(id),
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: policies
-- ================================================================
CREATE TABLE IF NOT EXISTS policies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id   UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  category_en     TEXT,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  content_ar      TEXT NOT NULL,
  content_en      TEXT,
  version         INTEGER NOT NULL DEFAULT 1,
  workflow_status workflow_status NOT NULL DEFAULT 'draft',
  is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by     UUID REFERENCES profiles(id),
  effective_date  DATE,
  review_date     DATE,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: procedures
-- ================================================================
CREATE TABLE IF NOT EXISTS procedures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id   UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id       UUID REFERENCES policies(id) ON DELETE SET NULL,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  category        TEXT,
  steps           JSONB NOT NULL DEFAULT '[]',
  responsible_ar  TEXT,
  frequency       TEXT,
  workflow_status workflow_status NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: kpis
-- ================================================================
CREATE TABLE IF NOT EXISTS kpis (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id   UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_ar   TEXT,
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  description_ar  TEXT,
  category        TEXT,
  formula         TEXT,
  target_value    NUMERIC,
  current_value   NUMERIC,
  unit            TEXT,
  frequency       TEXT NOT NULL DEFAULT 'monthly',
  direction       TEXT DEFAULT 'increase',
  weight          NUMERIC DEFAULT 1,
  owner_role_ar   TEXT,
  data_source     TEXT,
  calculation_method TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: kpi_readings (tracking over time)
-- ================================================================
CREATE TABLE IF NOT EXISTS kpi_readings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id      UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  value       NUMERIC NOT NULL,
  period_date DATE NOT NULL,
  notes       TEXT,
  entered_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: hiring_plan
-- ================================================================
CREATE TABLE IF NOT EXISTS hiring_plan (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id   UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phase           TEXT,
  phase_order     INTEGER DEFAULT 1,
  role_ar         TEXT NOT NULL,
  role_en         TEXT,
  department_ar   TEXT,
  priority        TEXT NOT NULL DEFAULT 'medium',
  timeline        TEXT,
  timeline_months INTEGER,
  salary_min      NUMERIC,
  salary_max      NUMERIC,
  currency        TEXT DEFAULT 'SAR',
  requirements    JSONB NOT NULL DEFAULT '[]',
  notes           TEXT,
  is_filled       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: forms_templates
-- ================================================================
CREATE TABLE IF NOT EXISTS forms_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id   UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  category        TEXT,
  form_schema     JSONB NOT NULL DEFAULT '{}',
  workflow_status workflow_status NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: exports
-- ================================================================
CREATE TABLE IF NOT EXISTS exports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  generation_id   UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  format          export_format NOT NULL,
  sections        TEXT[] DEFAULT '{}',
  file_url        TEXT,
  file_size       INTEGER,
  download_count  INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: audit_log
-- ================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: notifications
-- ================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title_ar    TEXT NOT NULL,
  body_ar     TEXT,
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_orgs_owner      ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_orgs_country    ON organizations(country);
CREATE INDEX IF NOT EXISTS idx_orgs_sector     ON organizations(sector_id);
CREATE INDEX IF NOT EXISTS idx_orgs_active     ON organizations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_members_org     ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_user    ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gen_org         ON ai_generations(org_id);
CREATE INDEX IF NOT EXISTS idx_gen_status      ON ai_generations(status);
CREATE INDEX IF NOT EXISTS idx_gen_created     ON ai_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nodes_gen       ON org_chart_nodes(generation_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent    ON org_chart_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_org       ON org_chart_nodes(org_id);
CREATE INDEX IF NOT EXISTS idx_jd_gen          ON job_descriptions(generation_id);
CREATE INDEX IF NOT EXISTS idx_jd_org          ON job_descriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_pol_gen         ON policies(generation_id);
CREATE INDEX IF NOT EXISTS idx_pol_org         ON policies(org_id);
CREATE INDEX IF NOT EXISTS idx_kpi_gen         ON kpis(generation_id);
CREATE INDEX IF NOT EXISTS idx_kpi_org         ON kpis(org_id);
CREATE INDEX IF NOT EXISTS idx_hire_gen        ON hiring_plan(generation_id);
CREATE INDEX IF NOT EXISTS idx_hire_org        ON hiring_plan(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_org       ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_user      ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_kpi_readings    ON kpi_readings(kpi_id, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_sectors_parent  ON sectors(parent_id);
CREATE INDEX IF NOT EXISTS idx_orgs_name_trgm  ON organizations USING GIN(name gin_trgm_ops);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_chart_nodes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures          ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis                ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_readings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiring_plan         ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors             ENABLE ROW LEVEL SECURITY;

-- Helper function: returns org_ids accessible by current user
CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM organizations WHERE owner_id = auth.uid()
  UNION
  SELECT org_id FROM organization_members WHERE user_id = auth.uid()
$$;

-- ----------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

DO $$ BEGIN
  CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- SECTORS (public read)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "sectors_public_read" ON sectors;
DO $$ BEGIN
  CREATE POLICY "sectors_public_read" ON sectors
  FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- ORGANIZATIONS
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "orgs_select" ON organizations;
DROP POLICY IF EXISTS "orgs_insert" ON organizations;
DROP POLICY IF EXISTS "orgs_update" ON organizations;
DROP POLICY IF EXISTS "orgs_delete" ON organizations;

DO $$ BEGIN
  CREATE POLICY "orgs_select" ON organizations
  FOR SELECT USING (id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "orgs_insert" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "orgs_update" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "orgs_delete" ON organizations
  FOR DELETE USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- ORGANIZATION_MEMBERS
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "members_select" ON organization_members;
DROP POLICY IF EXISTS "members_insert" ON organization_members;
DROP POLICY IF EXISTS "members_delete" ON organization_members;

DO $$ BEGIN
  CREATE POLICY "members_select" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "members_insert" ON organization_members
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "members_delete" ON organization_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- AI_GENERATIONS
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "gen_select" ON ai_generations;
DROP POLICY IF EXISTS "gen_insert" ON ai_generations;
DROP POLICY IF EXISTS "gen_update" ON ai_generations;

DO $$ BEGIN
  CREATE POLICY "gen_select" ON ai_generations
  FOR SELECT USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "gen_insert" ON ai_generations
  FOR INSERT WITH CHECK (
    org_id IN (SELECT user_org_ids()) AND created_by = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "gen_update" ON ai_generations
  FOR UPDATE USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- ORG_CHART_NODES, JOB_DESCRIPTIONS, POLICIES, PROCEDURES,
-- KPIS, HIRING_PLAN, FORMS_TEMPLATES, EXPORTS
-- ----------------------------------------------------------------
DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY['org_chart_nodes','job_descriptions','policies','procedures',
    'kpis','hiring_plan','forms_templates','exports'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "rls_%s" ON %s', tbl, tbl);
    EXECUTE format('CREATE POLICY "rls_%s" ON %s FOR ALL USING (org_id IN (SELECT user_org_ids()))', tbl, tbl);
  END LOOP;
END $$;

-- KPI readings
DROP POLICY IF EXISTS "rls_kpi_readings" ON kpi_readings;
DO $$ BEGIN
  CREATE POLICY "rls_kpi_readings" ON kpi_readings
  FOR ALL USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit log: owners can read their own org audit logs
DROP POLICY IF EXISTS "rls_audit_log" ON audit_log;
DO $$ BEGIN
  CREATE POLICY "rls_audit_log" ON audit_log
  FOR SELECT USING (
    org_id IN (SELECT user_org_ids()) OR user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notifications
DROP POLICY IF EXISTS "rls_notifications" ON notifications;
DO $$ BEGIN
  CREATE POLICY "rls_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- Auto-create profile on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, preferred_lang)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'preferred_lang', 'ar')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-add owner as org member
CREATE OR REPLACE FUNCTION public.handle_new_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_org_created ON organizations;
CREATE TRIGGER on_org_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_org();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS upd_profiles ON profiles;
DROP TRIGGER IF EXISTS upd_organizations ON organizations;
DROP TRIGGER IF EXISTS upd_jd ON job_descriptions;
DROP TRIGGER IF EXISTS upd_policies ON policies;
DROP TRIGGER IF EXISTS upd_kpis ON kpis;

DROP TRIGGER IF EXISTS upd_profiles ON profiles;
CREATE TRIGGER upd_profiles     BEFORE UPDATE ON profiles        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS upd_organizations ON organizations;
CREATE TRIGGER upd_organizations BEFORE UPDATE ON organizations   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS upd_jd ON job_descriptions;
CREATE TRIGGER upd_jd           BEFORE UPDATE ON job_descriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS upd_policies ON policies;
CREATE TRIGGER upd_policies     BEFORE UPDATE ON policies         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS upd_kpis ON kpis;
CREATE TRIGGER upd_kpis         BEFORE UPDATE ON kpis             FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- VIEWS
-- ================================================================
CREATE OR REPLACE VIEW organization_stats AS
SELECT
  o.id,
  o.name,
  o.country,
  o.employee_count,
  o.subscription_plan,
  COUNT(DISTINCT g.id)    FILTER (WHERE g.status = 'completed') AS completed_generations,
  COUNT(DISTINCT m.user_id) AS member_count,
  MAX(g.created_at)       AS last_generation_at,
  o.created_at
FROM organizations o
LEFT JOIN ai_generations g ON g.org_id = o.id
LEFT JOIN organization_members m ON m.org_id = o.id
GROUP BY o.id;


-- ================================================================
-- PAYMENT SYSTEM — Stripe Integration
-- ================================================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES profiles(id),
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id       TEXT,
  plan                  subscription_plan NOT NULL DEFAULT 'free_trial',
  status                TEXT NOT NULL DEFAULT 'active',
  -- Status values: active, canceled, past_due, unpaid, trialing, incomplete
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at           TIMESTAMPTZ,
  trial_end             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES subscriptions(id),
  stripe_invoice_id   TEXT UNIQUE,
  stripe_payment_intent TEXT,
  amount_paid         INTEGER NOT NULL DEFAULT 0,
  amount_due          INTEGER NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'usd',
  status              TEXT NOT NULL DEFAULT 'draft',
  -- Status: draft, open, paid, void, uncollectible
  invoice_pdf         TEXT,
  hosted_invoice_url  TEXT,
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage tracking for AI generations per plan
CREATE TABLE IF NOT EXISTS usage_tracking (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  generations_used INTEGER NOT NULL DEFAULT 0,
  limit_reached   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subs_org      ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subs_stripe   ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subs_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subs_status   ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_inv_org       ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_inv_stripe    ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_usage_org     ON usage_tracking(org_id);

-- RLS
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "subs_org" ON subscriptions FOR ALL
  USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "inv_org" ON invoices FOR ALL
  USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "usage_org" ON usage_tracking FOR ALL
  USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS upd_subscriptions ON subscriptions;
CREATE TRIGGER upd_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS upd_usage_tracking ON usage_tracking;
CREATE TRIGGER upd_usage_tracking
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- BUSINESS INTELLIGENCE LAYER
-- ================================================================

-- Funding sources & support programs
CREATE TABLE IF NOT EXISTS funding_programs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  provider_ar     TEXT NOT NULL,  -- الجهة المقدمة
  provider_en     TEXT,
  type            TEXT NOT NULL,  -- 'government','accelerator','incubator','vc','grant','loan'
  country         TEXT DEFAULT 'SA',
  sectors         TEXT[] DEFAULT '{}',
  org_sizes       TEXT[] DEFAULT '{}',  -- '1-10','11-50','51-200','201+'
  max_funding_sar NUMERIC(15,2),
  equity_required BOOLEAN DEFAULT FALSE,
  equity_pct_max  NUMERIC(5,2),
  description_ar  TEXT,
  requirements_ar TEXT[],
  benefits_ar     TEXT[],
  website_url     TEXT,
  apply_url       TEXT,
  deadline        DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  is_vision2030   BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funding_type    ON funding_programs(type);
CREATE INDEX IF NOT EXISTS idx_funding_country ON funding_programs(country);
ALTER TABLE funding_programs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "funding_public" ON funding_programs FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "funding_admin"  ON funding_programs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Business cost accounting
CREATE TABLE IF NOT EXISTS cost_models (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'النموذج الرئيسي',
  period          TEXT DEFAULT 'monthly',  -- monthly, quarterly, annual
  -- Fixed costs
  rent_sar        NUMERIC(12,2) DEFAULT 0,
  salaries_sar    NUMERIC(12,2) DEFAULT 0,
  utilities_sar   NUMERIC(12,2) DEFAULT 0,
  insurance_sar   NUMERIC(12,2) DEFAULT 0,
  other_fixed_sar NUMERIC(12,2) DEFAULT 0,
  -- Variable costs
  cogs_pct        NUMERIC(5,2) DEFAULT 0,  -- % of revenue
  marketing_sar   NUMERIC(12,2) DEFAULT 0,
  shipping_sar    NUMERIC(12,2) DEFAULT 0,
  other_var_sar   NUMERIC(12,2) DEFAULT 0,
  -- Revenue model
  unit_price_sar  NUMERIC(12,2) DEFAULT 0,
  units_per_month INTEGER DEFAULT 0,
  -- Computed (cached)
  total_fixed_sar  NUMERIC(12,2) GENERATED ALWAYS AS (rent_sar + salaries_sar + utilities_sar + insurance_sar + other_fixed_sar) STORED,
  -- AI suggestions
  ai_suggestions  JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cost_org ON cost_models(org_id);
ALTER TABLE cost_models ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cost_org" ON cost_models FOR ALL USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS upd_cost_models ON cost_models;
CREATE TRIGGER upd_cost_models BEFORE UPDATE ON cost_models FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Financial records (cash flow, P&L)
CREATE TABLE IF NOT EXISTS financial_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_year     INTEGER NOT NULL,
  period_month    INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  -- Revenue
  revenue_sales   NUMERIC(12,2) DEFAULT 0,
  revenue_services NUMERIC(12,2) DEFAULT 0,
  revenue_other   NUMERIC(12,2) DEFAULT 0,
  -- Expenses
  exp_salaries    NUMERIC(12,2) DEFAULT 0,
  exp_rent        NUMERIC(12,2) DEFAULT 0,
  exp_marketing   NUMERIC(12,2) DEFAULT 0,
  exp_operations  NUMERIC(12,2) DEFAULT 0,
  exp_technology  NUMERIC(12,2) DEFAULT 0,
  exp_other       NUMERIC(12,2) DEFAULT 0,
  -- Cash
  cash_opening    NUMERIC(12,2) DEFAULT 0,
  cash_closing    NUMERIC(12,2) DEFAULT 0,
  receivables     NUMERIC(12,2) DEFAULT 0,
  payables        NUMERIC(12,2) DEFAULT 0,
  -- AI analysis
  ai_analysis     JSONB DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, period_year, period_month)
);
CREATE INDEX IF NOT EXISTS idx_fin_org    ON financial_records(org_id);
CREATE INDEX IF NOT EXISTS idx_fin_period ON financial_records(period_year, period_month);
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "fin_org" ON financial_records FOR ALL USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS upd_financial ON financial_records;
CREATE TRIGGER upd_financial BEFORE UPDATE ON financial_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Loss analysis
CREATE TABLE IF NOT EXISTS loss_analyses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Loss data
  total_loss_sar      NUMERIC(12,2) DEFAULT 0,
  loss_period_months  INTEGER DEFAULT 3,
  -- AI analysis result
  health_score        INTEGER CHECK (health_score BETWEEN 0 AND 100),
  health_label        TEXT,   -- 'critical','warning','fair','good','excellent'
  loss_causes         JSONB DEFAULT '[]',   -- [{cause, impact_pct, description}]
  recovery_plan_30    JSONB DEFAULT '[]',   -- [{action, owner, priority}]
  recovery_plan_90    JSONB DEFAULT '[]',
  recovery_plan_180   JSONB DEFAULT '[]',
  risk_factors        JSONB DEFAULT '[]',
  recommendations     JSONB DEFAULT '[]',
  ai_model_used       TEXT DEFAULT 'gpt-4o',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loss_org ON loss_analyses(org_id);
ALTER TABLE loss_analyses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "loss_org" ON loss_analyses FOR ALL USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Business state snapshots (gap analysis)
CREATE TABLE IF NOT EXISTS business_states (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Current state dimensions (0-100)
  score_revenue       INTEGER DEFAULT 0,
  score_operations    INTEGER DEFAULT 0,
  score_team          INTEGER DEFAULT 0,
  score_technology    INTEGER DEFAULT 0,
  score_marketing     INTEGER DEFAULT 0,
  score_finance       INTEGER DEFAULT 0,
  score_compliance    INTEGER DEFAULT 0,
  -- Target state
  target_revenue      INTEGER DEFAULT 80,
  target_operations   INTEGER DEFAULT 80,
  target_team         INTEGER DEFAULT 80,
  target_technology   INTEGER DEFAULT 80,
  target_marketing    INTEGER DEFAULT 80,
  target_finance      INTEGER DEFAULT 80,
  target_compliance   INTEGER DEFAULT 80,
  -- AI-generated
  current_desc_ar     TEXT,
  target_desc_ar      TEXT,
  gap_analysis        JSONB DEFAULT '[]',
  development_plan    JSONB DEFAULT '[]',
  overall_score       INTEGER GENERATED ALWAYS AS (
    (score_revenue + score_operations + score_team + score_technology + score_marketing + score_finance + score_compliance) / 7
  ) STORED,
  ai_model_used       TEXT DEFAULT 'gpt-4o',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_state_org ON business_states(org_id);
ALTER TABLE business_states ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "state_org" ON business_states FOR ALL USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Contextual help definitions
CREATE TABLE IF NOT EXISTS help_definitions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_key   TEXT NOT NULL UNIQUE,  -- e.g. 'cost_rent', 'revenue_sales'
  label_ar    TEXT NOT NULL,
  tooltip_ar  TEXT NOT NULL,
  example_ar  TEXT,
  formula_ar  TEXT,
  learn_more_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE help_definitions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "help_public" ON help_definitions FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AI recommendations with reasons
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  generation_id   UUID REFERENCES ai_generations(id),
  category        TEXT NOT NULL,  -- 'funding','cost','financial','hr','strategy'
  title_ar        TEXT NOT NULL,
  body_ar         TEXT NOT NULL,
  reason_ar       TEXT NOT NULL,  -- WHY this recommendation
  evidence        JSONB DEFAULT '[]',  -- data points used
  priority        INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  impact_label    TEXT DEFAULT 'medium',  -- low, medium, high, critical
  effort_label    TEXT DEFAULT 'medium',
  action_steps    JSONB DEFAULT '[]',
  is_dismissed    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rec_org      ON ai_recommendations(org_id);
CREATE INDEX IF NOT EXISTS idx_rec_category ON ai_recommendations(category);
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "rec_org" ON ai_recommendations FOR ALL USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

