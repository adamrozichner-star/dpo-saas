-- Data flow diagram custom overrides
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS data_flow_overrides JSONB DEFAULT NULL;
