-- DPO C-level quarterly reports
CREATE TABLE IF NOT EXISTS dpo_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_period TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',

  executive_summary TEXT,
  compliance_score_start INT,
  compliance_score_end INT,
  incidents_count INT DEFAULT 0,
  incidents_summary JSONB DEFAULT '[]',
  findings_open INT DEFAULT 0,
  findings_resolved INT DEFAULT 0,
  dpia_count INT DEFAULT 0,
  dpia_high_risk INT DEFAULT 0,
  rights_requests_count INT DEFAULT 0,
  documents_updated INT DEFAULT 0,
  recommendations JSONB DEFAULT '[]',

  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  submitted_to_name TEXT,
  submitted_to_role TEXT,
  submitted_to_email TEXT,
  submitted_at TIMESTAMPTZ,
  acknowledgment_received BOOLEAN DEFAULT false,
  acknowledgment_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dpo_reports_org ON dpo_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_dpo_reports_period ON dpo_reports(period_end DESC);

ALTER TABLE dpo_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own org reports" ON dpo_reports FOR ALL USING (
  org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Service role full access reports" ON dpo_reports FOR ALL USING (true) WITH CHECK (true);
