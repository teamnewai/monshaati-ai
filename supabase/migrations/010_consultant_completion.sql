-- ================================================================
-- CONSULTANT COMPLETION — Verification, Payouts, Analytics
-- ================================================================

-- Add verification fields to consultant_profiles
ALTER TABLE consultant_profiles
  ADD COLUMN IF NOT EXISTS verification_notes   TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason    TEXT,
  ADD COLUMN IF NOT EXISTS approved_by         UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS stripe_onboarded    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_onboard_url  TEXT,
  ADD COLUMN IF NOT EXISTS payout_enabled      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS total_earnings_usd  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_payout_usd  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_payouts_usd   NUMERIC(12,2) DEFAULT 0;

-- Verification documents submitted by consultant
CREATE TABLE IF NOT EXISTS consultant_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id   UUID NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL,  -- national_id, cv, certifications, linkedin
  document_url    TEXT,
  notes           TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES profiles(id),
  review_status   TEXT DEFAULT 'pending'  -- pending, approved, rejected
);
ALTER TABLE consultant_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "docs_own"   ON consultant_documents FOR ALL
  USING (consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "docs_admin" ON consultant_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payout records
CREATE TABLE IF NOT EXISTS consultant_payouts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id        UUID NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  amount_usd           NUMERIC(12,2) NOT NULL,
  platform_fee_usd     NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount_usd       NUMERIC(12,2) NOT NULL,
  stripe_transfer_id   TEXT UNIQUE,
  stripe_payout_id     TEXT,
  status               TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, paid, failed
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  bookings_count       INTEGER DEFAULT 0,
  notes                TEXT,
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payout_consultant ON consultant_payouts(consultant_id);
CREATE INDEX IF NOT EXISTS idx_payout_status     ON consultant_payouts(status);
ALTER TABLE consultant_payouts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "payout_own"   ON consultant_payouts FOR SELECT
  USING (consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "payout_admin" ON consultant_payouts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS upd_payouts ON consultant_payouts;
CREATE TRIGGER upd_payouts BEFORE UPDATE ON consultant_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update earnings on booking completed
CREATE OR REPLACE FUNCTION update_consultant_earnings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE consultant_profiles SET
      total_earnings_usd = total_earnings_usd + NEW.price_usd - COALESCE(NEW.platform_fee_usd, 0),
      pending_payout_usd = pending_payout_usd + NEW.price_usd - COALESCE(NEW.platform_fee_usd, 0),
      total_sessions     = total_sessions + 1
    WHERE id = NEW.consultant_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_booking_completed ON consultant_bookings;
CREATE TRIGGER on_booking_completed
  AFTER UPDATE OF status ON consultant_bookings
  FOR EACH ROW EXECUTE FUNCTION update_consultant_earnings();

