-- ================================================================
-- CUSTOMER SUPPORT SYSTEM — Tickets, Chat, Voice, CRM
-- ================================================================

DO $$ BEGIN
  CREATE TYPE ticket_status   AS ENUM ('open','in_progress','waiting','resolved','closed');
  CREATE TYPE ticket_priority AS ENUM ('low','medium','high','urgent');
  CREATE TYPE ticket_channel  AS ENUM ('chat','email','voice','callback','web');
  CREATE TYPE call_status     AS ENUM ('requested','queued','in_progress','completed','missed','failed');
  CREATE TYPE agent_status    AS ENUM ('available','busy','offline','break');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Support Agents (staff who handle tickets and calls)
CREATE TABLE IF NOT EXISTS support_agents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  status          agent_status NOT NULL DEFAULT 'offline',
  is_active       BOOLEAN DEFAULT TRUE,
  specializations TEXT[] DEFAULT '{}',
  languages       TEXT[] DEFAULT '{ar,en}',
  max_concurrent  INTEGER DEFAULT 3,
  current_load    INTEGER DEFAULT 0,
  total_tickets   INTEGER DEFAULT 0,
  avg_rating      NUMERIC(3,2) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS upd_agents ON support_agents;
CREATE TRIGGER upd_agents BEFORE UPDATE ON support_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "agents_admin" ON support_agents FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "agents_self" ON support_agents FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "agents_public_read" ON support_agents FOR SELECT
    USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number   TEXT NOT NULL UNIQUE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  org_id          UUID REFERENCES organizations(id),
  agent_id        UUID REFERENCES support_agents(id),
  channel         ticket_channel NOT NULL DEFAULT 'web',
  status          ticket_status NOT NULL DEFAULT 'open',
  priority        ticket_priority NOT NULL DEFAULT 'medium',
  subject         TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT,
  tags            TEXT[] DEFAULT '{}',
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_user   ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_agent  ON support_tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_number ON support_tickets(ticket_number);
DROP TRIGGER IF EXISTS upd_tickets ON support_tickets;
CREATE TRIGGER upd_tickets BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "ticket_own" ON support_tickets FOR ALL
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "ticket_admin" ON support_tickets FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ticket Messages (chat + email replies)
CREATE TABLE IF NOT EXISTS ticket_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id     UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id     UUID REFERENCES profiles(id),
  sender_type   TEXT NOT NULL CHECK (sender_type IN ('user','agent','system','ai')),
  content       TEXT NOT NULL,
  is_internal   BOOLEAN DEFAULT FALSE,
  attachments   JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tmsg_ticket ON ticket_messages(ticket_id);
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "tmsg_own" ON ticket_messages FOR ALL
    USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "tmsg_admin" ON ticket_messages FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Voice / Call Records
CREATE TABLE IF NOT EXISTS support_calls (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id       UUID REFERENCES support_tickets(id),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  agent_id        UUID REFERENCES support_agents(id),
  status          call_status NOT NULL DEFAULT 'requested',
  direction       TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound','callback')),
  caller_phone    TEXT,
  agent_phone     TEXT,
  provider        TEXT NOT NULL DEFAULT 'twilio' CHECK (provider IN ('twilio','vonage')),
  provider_call_id TEXT,
  duration_secs   INTEGER,
  recording_url   TEXT,
  recording_enabled BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  call_quality    INTEGER CHECK (call_quality BETWEEN 1 AND 5),
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_call_user   ON support_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_call_agent  ON support_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_status ON support_calls(status);
DROP TRIGGER IF EXISTS upd_calls ON support_calls;
CREATE TRIGGER upd_calls BEFORE UPDATE ON support_calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE support_calls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "call_own" ON support_calls FOR ALL
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "call_admin" ON support_calls FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ticket number generator
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(NEXTVAL('ticket_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1000;
DROP TRIGGER IF EXISTS on_ticket_created ON support_tickets;
CREATE TRIGGER on_ticket_created
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Auto-assign to available agent
CREATE OR REPLACE FUNCTION auto_assign_ticket()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_agent_id UUID;
BEGIN
  IF NEW.agent_id IS NULL AND NEW.status = 'open' THEN
    SELECT id INTO v_agent_id
    FROM support_agents
    WHERE is_active = TRUE AND status = 'available'
      AND current_load < max_concurrent
    ORDER BY current_load ASC, avg_rating DESC
    LIMIT 1;
    IF v_agent_id IS NOT NULL THEN
      NEW.agent_id := v_agent_id;
      UPDATE support_agents SET current_load = current_load + 1 WHERE id = v_agent_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_ticket_assign ON support_tickets;
CREATE TRIGGER on_ticket_assign
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION auto_assign_ticket();

