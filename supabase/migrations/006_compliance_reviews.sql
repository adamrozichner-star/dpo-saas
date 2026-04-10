-- Compliance review results persistence
CREATE TABLE IF NOT EXISTS compliance_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  score integer NOT NULL,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_reviews_org_reviewed
  ON compliance_reviews (org_id, reviewed_at DESC);

ALTER TABLE compliance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org compliance reviews"
  ON compliance_reviews FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Service role can insert compliance reviews"
  ON compliance_reviews FOR INSERT
  WITH CHECK (true);
