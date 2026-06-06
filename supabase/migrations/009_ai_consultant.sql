-- ================================================================
-- AI Business Consultant System
-- ================================================================

DO $$ BEGIN
  CREATE TYPE consultant_type AS ENUM (
    'administrative','operational','hr','financial',
    'growth','funding','restructuring','strategic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Conversations
CREATE TABLE IF NOT EXISTS consultant_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  title           TEXT,
  topic           consultant_type,
  status          TEXT NOT NULL DEFAULT 'active', -- active, closed, escalated
  disclaimer_accepted     BOOLEAN NOT NULL DEFAULT FALSE,
  disclaimer_accepted_at  TIMESTAMPTZ,
  escalated_to    UUID REFERENCES consultant_profiles(id),
  escalated_at    TIMESTAMPTZ,
  escalation_reason TEXT,
  messages_count  INTEGER DEFAULT 0,
  total_tokens    INTEGER DEFAULT 0,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_org    ON consultant_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conv_user   ON consultant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_status ON consultant_conversations(status);
ALTER TABLE consultant_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "conv_own" ON consultant_conversations FOR ALL
  USING (org_id IN (SELECT user_org_ids()) OR user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Messages
CREATE TABLE IF NOT EXISTS consultant_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES consultant_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  topic           consultant_type,
  confidence_score NUMERIC(3,0) CHECK (confidence_score BETWEEN 0 AND 100),
  risk_level      risk_level,
  impact_level    TEXT CHECK (impact_level IN ('low','medium','high','critical')),
  recommendations JSONB DEFAULT '[]',
  data_sources    TEXT[] DEFAULT '{}', -- which org data was used
  escalation_suggested BOOLEAN DEFAULT FALSE,
  suggested_consultants JSONB DEFAULT '[]',
  disclaimer_shown BOOLEAN DEFAULT FALSE,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON consultant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_msg_role ON consultant_messages(role);
ALTER TABLE consultant_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "msg_conv" ON consultant_messages FOR ALL
  USING (conversation_id IN (
    SELECT id FROM consultant_conversations
    WHERE org_id IN (SELECT user_org_ids()) OR user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AI Usage Analytics (for Admin)
CREATE TABLE IF NOT EXISTS ai_consultant_stats (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  total_conversations  INTEGER DEFAULT 0,
  total_messages       INTEGER DEFAULT 0,
  total_recommendations INTEGER DEFAULT 0,
  total_escalations    INTEGER DEFAULT 0,
  avg_confidence       NUMERIC(5,2),
  avg_satisfaction     NUMERIC(3,2),
  tokens_used          INTEGER DEFAULT 0,
  topics_breakdown     JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_date)
);
ALTER TABLE ai_consultant_stats ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "stats_admin" ON ai_consultant_stats FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger: update conversation counts
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE consultant_conversations
    SET messages_count = messages_count + 1,
        updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_message_added ON consultant_messages;
CREATE TRIGGER on_message_added
  AFTER INSERT ON consultant_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

