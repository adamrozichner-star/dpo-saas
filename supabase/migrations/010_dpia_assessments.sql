-- DPIA (Privacy Impact Assessment) module
CREATE TABLE IF NOT EXISTS dpia_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  activity_id TEXT,
  description TEXT,
  legal_basis TEXT,
  data_categories JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  controls JSONB DEFAULT '[]',
  residual_score INT,
  risk_level TEXT,
  action_plan JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  next_review_date DATE DEFAULT (NOW() + INTERVAL '18 months'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dpia_org ON dpia_assessments(org_id);
CREATE INDEX IF NOT EXISTS idx_dpia_review ON dpia_assessments(next_review_date) WHERE status != 'archived';

ALTER TABLE dpia_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own org DPIAs" ON dpia_assessments FOR ALL USING (
  org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Service role full access DPIAs" ON dpia_assessments FOR ALL USING (true) WITH CHECK (true);
