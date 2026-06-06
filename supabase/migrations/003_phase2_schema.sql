-- ================================================================
-- MONSHAATI AI — Phase 2 Complete Schema
-- ================================================================

-- ----------------------------------------------------------------
-- FREE TRIAL SYSTEM
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trial_notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  type        TEXT NOT NULL, -- 'trial_started','day_7','day_10','day_13','expired'
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_trial_notif_org ON trial_notifications(org_id);
ALTER TABLE trial_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "trial_notif_org" ON trial_notifications FOR ALL
  USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add trial tracking columns to organizations (if not exist)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_started_at   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_generation_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_expired_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_trial_expired   BOOLEAN DEFAULT FALSE;

-- ----------------------------------------------------------------
-- PAY AS YOU GO SYSTEM
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE payg_service AS ENUM (
    'org_chart','job_descriptions','policies','procedures',
    'kpi_package','hiring_plan','full_package'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payg_prices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service      payg_service NOT NULL UNIQUE,
  price_usd    NUMERIC(10,2) NOT NULL,
  price_sar    NUMERIC(10,2) NOT NULL,
  stripe_price_id TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payg_purchases (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id),
  generation_id       UUID REFERENCES ai_generations(id),
  service             payg_service NOT NULL,
  price_paid_usd      NUMERIC(10,2) NOT NULL,
  price_paid_sar      NUMERIC(10,2),
  currency            TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id   TEXT UNIQUE,
  stripe_payment_intent TEXT,
  status              TEXT NOT NULL DEFAULT 'pending', -- pending, completed, refunded
  purchased_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payg_org    ON payg_purchases(org_id);
CREATE INDEX IF NOT EXISTS idx_payg_status ON payg_purchases(status);
ALTER TABLE payg_prices    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payg_purchases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "payg_prices_read"   ON payg_prices    FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "payg_purchases_org" ON payg_purchases FOR ALL
  USING (org_id IN (SELECT user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed PAYG prices
INSERT INTO payg_prices (service, price_usd, price_sar) VALUES
  ('org_chart',       1.00,  3.75),
  ('job_descriptions',1.00,  3.75),
  ('policies',        2.00,  7.50),
  ('procedures',      2.00,  7.50),
  ('kpi_package',     2.00,  7.50),
  ('hiring_plan',     2.00,  7.50),
  ('full_package',    8.00, 30.00)
ON CONFLICT (service) DO NOTHING;

-- ----------------------------------------------------------------
-- COUPON SYSTEM
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage','fixed_usd','fixed_sar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  discount_type   discount_type NOT NULL,
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_usd   NUMERIC(10,2) DEFAULT 0,
  max_uses        INTEGER,
  uses_count      INTEGER NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  applies_to      TEXT DEFAULT 'all', -- 'all','subscriptions','payg','marketplace'
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_code ON coupons(UPPER(code));

CREATE TABLE IF NOT EXISTS coupon_uses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  org_id      UUID REFERENCES organizations(id),
  order_type  TEXT NOT NULL,
  order_id    UUID,
  discount_applied NUMERIC(10,2) NOT NULL,
  used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon ON coupon_uses(coupon_id);
ALTER TABLE coupons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses  ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "coupons_public_read" ON coupons    FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "coupon_uses_own"     ON coupon_uses FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- REFERRAL SYSTEM
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id       UUID NOT NULL REFERENCES profiles(id),
  referrer_org_id   UUID REFERENCES organizations(id),
  referee_id        UUID REFERENCES profiles(id),
  referee_org_id    UUID REFERENCES organizations(id),
  referral_code     TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending, converted, rewarded
  reward_type       TEXT DEFAULT 'free_month',       -- free_month, credit_usd, discount
  reward_value      NUMERIC(10,2),
  reward_applied    BOOLEAN DEFAULT FALSE,
  converted_at      TIMESTAMPTZ,
  rewarded_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_code      ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_referrer  ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_referee   ON referrals(referee_id);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "referrals_own" ON referrals FOR ALL
  USING (referrer_id = auth.uid() OR referee_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add referral_code to profiles (for sharing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code = 'MSH-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_profile_set_referral ON profiles;
CREATE TRIGGER on_profile_set_referral
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Update existing profiles with referral codes
UPDATE profiles SET referral_code = 'MSH-' || UPPER(SUBSTRING(id::TEXT, 1, 8))
WHERE referral_code IS NULL;

-- ----------------------------------------------------------------
-- CONSULTANT MARKETPLACE
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE consultant_status AS ENUM ('pending','active','suspended','inactive');
  CREATE TYPE booking_status AS ENUM ('pending','confirmed','completed','cancelled','no_show');
  CREATE TYPE session_duration AS ENUM ('30min','60min');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS consultant_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  display_name      TEXT NOT NULL,
  display_name_ar   TEXT,
  bio_ar            TEXT,
  bio_en            TEXT,
  avatar_url        TEXT,
  specializations   TEXT[] DEFAULT '{}',
  industries        TEXT[] DEFAULT '{}',
  languages         TEXT[] DEFAULT '{"ar"}',
  years_experience  INTEGER DEFAULT 0,
  location          TEXT,
  country           TEXT DEFAULT 'SA',
  linkedin_url      TEXT,
  website_url       TEXT,
  price_30min_usd   NUMERIC(10,2) DEFAULT 15.00,
  price_60min_usd   NUMERIC(10,2) DEFAULT 25.00,
  price_30min_sar   NUMERIC(10,2) DEFAULT 56.25,
  price_60min_sar   NUMERIC(10,2) DEFAULT 93.75,
  currency          TEXT DEFAULT 'SAR',
  stripe_account_id TEXT,         -- Stripe Connect for payouts
  platform_commission_pct NUMERIC(5,2) DEFAULT 20.00,
  status            consultant_status NOT NULL DEFAULT 'pending',
  is_featured       BOOLEAN DEFAULT FALSE,
  total_sessions    INTEGER DEFAULT 0,
  avg_rating        NUMERIC(3,2) DEFAULT 0,
  total_reviews     INTEGER DEFAULT 0,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cons_status     ON consultant_profiles(status);
CREATE INDEX IF NOT EXISTS idx_cons_rating     ON consultant_profiles(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_cons_featured   ON consultant_profiles(is_featured) WHERE is_featured = TRUE;

CREATE TABLE IF NOT EXISTS consultant_availability (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id     UUID NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  day_of_week       INTEGER NOT NULL, -- 0=Sun...6=Sat
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  timezone          TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(consultant_id, day_of_week, start_time)
);
CREATE INDEX IF NOT EXISTS idx_avail_cons ON consultant_availability(consultant_id);

CREATE TABLE IF NOT EXISTS consultant_bookings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id       UUID NOT NULL REFERENCES consultant_profiles(id),
  client_org_id       UUID NOT NULL REFERENCES organizations(id),
  client_user_id      UUID NOT NULL REFERENCES profiles(id),
  duration            session_duration NOT NULL DEFAULT '60min',
  scheduled_at        TIMESTAMPTZ NOT NULL,
  timezone            TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  status              booking_status NOT NULL DEFAULT 'pending',
  price_usd           NUMERIC(10,2) NOT NULL,
  price_sar           NUMERIC(10,2),
  currency            TEXT DEFAULT 'SAR',
  stripe_session_id   TEXT UNIQUE,
  stripe_payment_intent TEXT,
  platform_fee_usd    NUMERIC(10,2),
  consultant_payout   NUMERIC(10,2),
  meeting_type        TEXT DEFAULT 'zoom',  -- zoom, google_meet, other
  meeting_url         TEXT,
  meeting_id          TEXT,
  meeting_password    TEXT,
  zoom_join_url       TEXT,
  zoom_start_url      TEXT,
  notes               TEXT,
  cancellation_reason TEXT,
  cancelled_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_book_consultant ON consultant_bookings(consultant_id);
CREATE INDEX IF NOT EXISTS idx_book_client     ON consultant_bookings(client_user_id);
CREATE INDEX IF NOT EXISTS idx_book_status     ON consultant_bookings(status);
CREATE INDEX IF NOT EXISTS idx_book_scheduled  ON consultant_bookings(scheduled_at);

CREATE TABLE IF NOT EXISTS consultant_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL UNIQUE REFERENCES consultant_bookings(id),
  consultant_id   UUID NOT NULL REFERENCES consultant_profiles(id),
  reviewer_id     UUID NOT NULL REFERENCES profiles(id),
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  body            TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_consultant ON consultant_reviews(consultant_id);

-- Auto-update consultant avg_rating
CREATE OR REPLACE FUNCTION update_consultant_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE consultant_profiles SET
    avg_rating    = (SELECT AVG(rating) FROM consultant_reviews WHERE consultant_id = NEW.consultant_id),
    total_reviews = (SELECT COUNT(*)    FROM consultant_reviews WHERE consultant_id = NEW.consultant_id)
  WHERE id = NEW.consultant_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_review_update_rating ON consultant_reviews;
CREATE TRIGGER on_review_update_rating
  AFTER INSERT OR UPDATE ON consultant_reviews
  FOR EACH ROW EXECUTE FUNCTION update_consultant_rating();

ALTER TABLE consultant_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_reviews      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cons_profiles_public"  ON consultant_profiles     FOR SELECT USING (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cons_profiles_own"     ON consultant_profiles     FOR ALL    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cons_avail_public"     ON consultant_availability FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cons_avail_own"        ON consultant_availability FOR ALL    USING (consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cons_bookings_parties" ON consultant_bookings     FOR ALL    USING (client_user_id = auth.uid() OR consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cons_reviews_public"   ON consultant_reviews      FOR SELECT USING (is_public = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cons_reviews_own"      ON consultant_reviews      FOR INSERT WITH CHECK (reviewer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- DIGITAL PRODUCTS MARKETPLACE
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE product_category AS ENUM (
    'org_chart','job_descriptions','policies','procedures',
    'kpi_templates','hr_templates','strategic_plans','sops',
    'saudi_compliance','onboarding_kits','training_materials'
  );
  CREATE TYPE product_status AS ENUM ('draft','review','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS marketplace_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID NOT NULL REFERENCES profiles(id),
  seller_org_id   UUID REFERENCES organizations(id),
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  description_ar  TEXT NOT NULL,
  description_en  TEXT,
  category        product_category NOT NULL,
  subcategory     TEXT,
  tags            TEXT[] DEFAULT '{}',
  industries      TEXT[] DEFAULT '{}',
  price_usd       NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_sar       NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_free         BOOLEAN NOT NULL DEFAULT FALSE,
  preview_url     TEXT,
  file_url        TEXT,
  file_format     TEXT DEFAULT 'pdf',   -- pdf, docx, xlsx, zip
  file_size_kb    INTEGER,
  pages_count     INTEGER,
  cover_image_url TEXT,
  status          product_status NOT NULL DEFAULT 'draft',
  is_featured     BOOLEAN DEFAULT FALSE,
  downloads_count INTEGER DEFAULT 0,
  avg_rating      NUMERIC(3,2) DEFAULT 0,
  total_reviews   INTEGER DEFAULT 0,
  platform_commission_pct NUMERIC(5,2) DEFAULT 30.00,
  language        TEXT DEFAULT 'ar',
  version         TEXT DEFAULT '1.0',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mp_category  ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_mp_status    ON marketplace_products(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_mp_featured  ON marketplace_products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_mp_free      ON marketplace_products(is_free);

CREATE TABLE IF NOT EXISTS product_purchases (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID NOT NULL REFERENCES marketplace_products(id),
  buyer_id          UUID NOT NULL REFERENCES profiles(id),
  buyer_org_id      UUID REFERENCES organizations(id),
  price_paid_usd    NUMERIC(10,2) NOT NULL,
  price_paid_sar    NUMERIC(10,2),
  currency          TEXT DEFAULT 'SAR',
  stripe_session_id TEXT UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending',
  download_count    INTEGER DEFAULT 0,
  download_limit    INTEGER DEFAULT 5,
  last_downloaded   TIMESTAMPTZ,
  purchased_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pp_buyer   ON product_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_pp_product ON product_purchases(product_id);

CREATE TABLE IF NOT EXISTS product_reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES product_purchases(id),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, reviewer_id)
);

-- Auto-update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE marketplace_products SET
    avg_rating    = (SELECT AVG(rating) FROM product_reviews WHERE product_id = NEW.product_id),
    total_reviews = (SELECT COUNT(*)    FROM product_reviews WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_product_review ON product_reviews;
CREATE TRIGGER on_product_review
  AFTER INSERT OR UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_purchases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "mp_products_published" ON marketplace_products FOR SELECT USING (status = 'published' OR seller_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mp_products_seller"    ON marketplace_products FOR ALL    USING (seller_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "pp_buyer"              ON product_purchases    FOR ALL    USING (buyer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "pr_public"             ON product_reviews      FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "pr_own"                ON product_reviews      FOR INSERT WITH CHECK (reviewer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- WHITE LABEL / TENANTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  plan            TEXT NOT NULL DEFAULT 'white_label',
  custom_domain   TEXT UNIQUE,
  logo_url        TEXT,
  favicon_url     TEXT,
  primary_color   TEXT DEFAULT '#c8912a',
  secondary_color TEXT DEFAULT '#1a1a2e',
  support_email   TEXT,
  support_phone   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_fee_usd NUMERIC(10,2) DEFAULT 299.00,
  stripe_sub_id   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_slug   ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_domain ON tenants(custom_domain);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "tenants_own" ON tenants FOR ALL USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add tenant_id to organizations for isolation
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_org_tenant ON organizations(tenant_id);

-- ----------------------------------------------------------------
-- SAUDI LIBRARY
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE library_type AS ENUM (
    'org_chart','policy','procedure','kpi','job_description',
    'form','sop','strategic_plan','hr_template','onboarding'
  );
  CREATE TYPE saudi_sector AS ENUM (
    'healthcare','education','finance','retail','construction',
    'technology','hospitality','logistics','manufacturing',
    'government','nonprofit','real_estate','energy','consulting'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS saudi_library (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            library_type NOT NULL,
  sector          saudi_sector,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  description_ar  TEXT,
  content_ar      TEXT,
  content_json    JSONB,
  tags            TEXT[] DEFAULT '{}',
  org_size        TEXT,            -- '1-10','11-50','51-200','201+'
  is_vision2030   BOOLEAN DEFAULT FALSE,
  is_nitaqat      BOOLEAN DEFAULT FALSE,
  is_gosi         BOOLEAN DEFAULT FALSE,
  regulatory_ref  TEXT,            -- reference to Saudi regulation
  is_free         BOOLEAN DEFAULT TRUE,
  is_featured     BOOLEAN DEFAULT FALSE,
  downloads_count INTEGER DEFAULT 0,
  version         TEXT DEFAULT '1.0',
  last_updated    DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lib_type    ON saudi_library(type);
CREATE INDEX IF NOT EXISTS idx_lib_sector  ON saudi_library(sector);
CREATE INDEX IF NOT EXISTS idx_lib_free    ON saudi_library(is_free);
ALTER TABLE saudi_library ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "library_public" ON saudi_library FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "library_admin"  ON saudi_library FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- REVENUE ANALYTICS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS revenue_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    TEXT NOT NULL,  -- subscription, payg, marketplace, consultation, white_label
  org_id        UUID REFERENCES organizations(id),
  user_id       UUID REFERENCES profiles(id),
  amount_usd    NUMERIC(10,2) NOT NULL,
  amount_sar    NUMERIC(10,2),
  currency      TEXT DEFAULT 'usd',
  stripe_id     TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rev_type    ON revenue_events(event_type);
CREATE INDEX IF NOT EXISTS idx_rev_created ON revenue_events(created_at DESC);
ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "rev_admin" ON revenue_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

