-- ================================================================
-- MONSHAATI AI — Business Intelligence Layer
-- ================================================================

-- Funding programs & support
CREATE TABLE IF NOT EXISTS funding_programs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  provider_ar     TEXT NOT NULL,
  type            TEXT NOT NULL, -- government,accelerator,incubator,vc,grant,loan,bank
  country         TEXT DEFAULT 'SA',
  sectors         TEXT[] DEFAULT '{}',
  org_sizes       TEXT[] DEFAULT '{}',
  max_funding_sar NUMERIC(15,2),
  equity_required BOOLEAN DEFAULT FALSE,
  equity_pct_max  NUMERIC(5,2),
  description_ar  TEXT,
  requirements_ar TEXT[] DEFAULT '{}',
  benefits_ar     TEXT[] DEFAULT '{}',
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
  period          TEXT DEFAULT 'monthly',
  rent_sar        NUMERIC(12,2) DEFAULT 0,
  salaries_sar    NUMERIC(12,2) DEFAULT 0,
  utilities_sar   NUMERIC(12,2) DEFAULT 0,
  insurance_sar   NUMERIC(12,2) DEFAULT 0,
  other_fixed_sar NUMERIC(12,2) DEFAULT 0,
  cogs_pct        NUMERIC(5,2) DEFAULT 0,
  marketing_sar   NUMERIC(12,2) DEFAULT 0,
  shipping_sar    NUMERIC(12,2) DEFAULT 0,
  other_var_sar   NUMERIC(12,2) DEFAULT 0,
  unit_price_sar  NUMERIC(12,2) DEFAULT 0,
  units_per_month INTEGER DEFAULT 0,
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

-- Financial records (P&L + Cash Flow)
CREATE TABLE IF NOT EXISTS financial_records (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_year      INTEGER NOT NULL,
  period_month     INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  revenue_sales    NUMERIC(12,2) DEFAULT 0,
  revenue_services NUMERIC(12,2) DEFAULT 0,
  revenue_other    NUMERIC(12,2) DEFAULT 0,
  exp_salaries     NUMERIC(12,2) DEFAULT 0,
  exp_rent         NUMERIC(12,2) DEFAULT 0,
  exp_marketing    NUMERIC(12,2) DEFAULT 0,
  exp_operations   NUMERIC(12,2) DEFAULT 0,
  exp_technology   NUMERIC(12,2) DEFAULT 0,
  exp_other        NUMERIC(12,2) DEFAULT 0,
  cash_opening     NUMERIC(12,2) DEFAULT 0,
  cash_closing     NUMERIC(12,2) DEFAULT 0,
  receivables      NUMERIC(12,2) DEFAULT 0,
  payables         NUMERIC(12,2) DEFAULT 0,
  ai_analysis      JSONB DEFAULT '{}',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  total_loss_sar    NUMERIC(12,2) DEFAULT 0,
  loss_period_months INTEGER DEFAULT 3,
  health_score      INTEGER CHECK (health_score BETWEEN 0 AND 100),
  health_label      TEXT,
  loss_causes       JSONB DEFAULT '[]',
  recovery_plan_30  JSONB DEFAULT '[]',
  recovery_plan_90  JSONB DEFAULT '[]',
  recovery_plan_180 JSONB DEFAULT '[]',
  risk_factors      JSONB DEFAULT '[]',
  recommendations   JSONB DEFAULT '[]',
  ai_model_used     TEXT DEFAULT 'gpt-4o',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loss_org ON loss_analyses(org_id);
ALTER TABLE loss_analyses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "loss_org" ON loss_analyses FOR ALL USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Business state / gap analysis
CREATE TABLE IF NOT EXISTS business_states (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  score_revenue     INTEGER DEFAULT 0 CHECK (score_revenue BETWEEN 0 AND 100),
  score_operations  INTEGER DEFAULT 0 CHECK (score_operations BETWEEN 0 AND 100),
  score_team        INTEGER DEFAULT 0 CHECK (score_team BETWEEN 0 AND 100),
  score_technology  INTEGER DEFAULT 0 CHECK (score_technology BETWEEN 0 AND 100),
  score_marketing   INTEGER DEFAULT 0 CHECK (score_marketing BETWEEN 0 AND 100),
  score_finance     INTEGER DEFAULT 0 CHECK (score_finance BETWEEN 0 AND 100),
  score_compliance  INTEGER DEFAULT 0 CHECK (score_compliance BETWEEN 0 AND 100),
  target_revenue    INTEGER DEFAULT 80,
  target_operations INTEGER DEFAULT 80,
  target_team       INTEGER DEFAULT 80,
  target_technology INTEGER DEFAULT 80,
  target_marketing  INTEGER DEFAULT 80,
  target_finance    INTEGER DEFAULT 80,
  target_compliance INTEGER DEFAULT 80,
  current_desc_ar   TEXT,
  target_desc_ar    TEXT,
  gap_analysis      JSONB DEFAULT '[]',
  development_plan  JSONB DEFAULT '[]',
  ai_model_used     TEXT DEFAULT 'gpt-4o',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_state_org ON business_states(org_id);
ALTER TABLE business_states ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "state_org" ON business_states FOR ALL USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Contextual help
CREATE TABLE IF NOT EXISTS help_definitions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_key   TEXT NOT NULL UNIQUE,
  label_ar    TEXT NOT NULL,
  tooltip_ar  TEXT NOT NULL,
  example_ar  TEXT,
  formula_ar  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE help_definitions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "help_public" ON help_definitions FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AI recommendations with WHY
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES ai_generations(id),
  category      TEXT NOT NULL,
  title_ar      TEXT NOT NULL,
  body_ar       TEXT NOT NULL,
  reason_ar     TEXT NOT NULL,
  evidence      JSONB DEFAULT '[]',
  priority      INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  impact_label  TEXT DEFAULT 'medium',
  effort_label  TEXT DEFAULT 'medium',
  action_steps  JSONB DEFAULT '[]',
  is_dismissed  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rec_org      ON ai_recommendations(org_id);
CREATE INDEX IF NOT EXISTS idx_rec_category ON ai_recommendations(category);
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "rec_org" ON ai_recommendations FOR ALL USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

