-- Messaging System Tables
-- Run this in Supabase SQL Editor

-- Message threads between organization and DPO
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'open', -- open, closed
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual messages within threads
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL, -- 'user', 'dpo', 'system'
  sender_id UUID,
  sender_name VARCHAR(255),
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'message', 'document', 'reminder', 'alert'
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link VARCHAR(500),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance tasks/checklist
CREATE TABLE IF NOT EXISTS compliance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'document', 'process', 'training', 'review'
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval VARCHAR(50), -- 'monthly', 'quarterly', 'yearly'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_org ON message_threads(org_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_status ON message_threads(status);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_org ON compliance_tasks(org_id);

-- RLS Policies
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tasks ENABLE ROW LEVEL SECURITY;

-- Users can see their org's threads
CREATE POLICY "Users can view own org threads" ON message_threads
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can create threads for their org
CREATE POLICY "Users can create threads" ON message_threads
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can view messages in their threads
CREATE POLICY "Users can view thread messages" ON messages
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM message_threads 
      WHERE org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Users can create messages
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    thread_id IN (
      SELECT id FROM message_threads 
      WHERE org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

-- Compliance tasks policies
CREATE POLICY "Users can view own tasks" ON compliance_tasks
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

-- Trigger to update thread's last_message_at
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads 
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message();

-- Function to create default compliance tasks for new org
CREATE OR REPLACE FUNCTION create_default_compliance_tasks(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO compliance_tasks (org_id, title, description, category, is_recurring, recurring_interval) VALUES
  (p_org_id, 'עדכון מדיניות פרטיות', 'סקירה ועדכון שנתי של מדיניות הפרטיות', 'document', true, 'yearly'),
  (p_org_id, 'הדרכת עובדים', 'הדרכה שנתית לעובדים בנושא פרטיות ואבטחת מידע', 'training', true, 'yearly'),
  (p_org_id, 'סקירת מאגרי מידע', 'בדיקה רבעונית של מאגרי המידע והרשאות הגישה', 'review', true, 'quarterly'),
  (p_org_id, 'גיבוי ובדיקת שחזור', 'בדיקה חודשית של הגיבויים ויכולת השחזור', 'process', true, 'monthly'),
  (p_org_id, 'סקירת צדדים שלישיים', 'בדיקה שנתית של ספקים וגישתם למידע', 'review', true, 'yearly');
END;
$$ LANGUAGE plpgsql;
