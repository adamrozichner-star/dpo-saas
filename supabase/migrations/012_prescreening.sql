-- AI pre-screening for DPO questions
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS pre_screening_status TEXT DEFAULT NULL;
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS pre_screening_summary TEXT DEFAULT NULL;
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS pre_screening_messages JSONB DEFAULT '[]';
