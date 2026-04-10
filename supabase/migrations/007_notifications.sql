-- Smart notifications system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT,
  action_url TEXT,
  action_label TEXT,
  read BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_org_unread ON notifications(org_id, read, dismissed) WHERE NOT dismissed;
CREATE UNIQUE INDEX idx_notifications_dedupe ON notifications(org_id, type, title) WHERE NOT dismissed;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own org notifications" ON notifications FOR SELECT USING (
  org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Service role can manage notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
