-- Data Subject Requests Table for Privacy Rights Management
-- Run this migration in Supabase SQL Editor

-- Create the data_subject_requests table
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    request_number VARCHAR(50) NOT NULL UNIQUE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'objection')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    requester_name VARCHAR(255) NOT NULL,
    requester_id VARCHAR(50) NOT NULL, -- ID number for verification
    requester_email VARCHAR(255) NOT NULL,
    requester_phone VARCHAR(50),
    details TEXT,
    response TEXT,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dsr_org_id ON data_subject_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_deadline ON data_subject_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_dsr_request_number ON data_subject_requests(request_number);

-- Enable Row Level Security
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view requests for their organization
CREATE POLICY "Users can view org requests"
ON data_subject_requests
FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- Policy: Service role can insert requests (for public form submissions)
CREATE POLICY "Service can insert requests"
ON data_subject_requests
FOR INSERT
WITH CHECK (true);

-- Policy: Users can update requests for their organization
CREATE POLICY "Users can update org requests"
ON data_subject_requests
FOR UPDATE
USING (
    org_id IN (
        SELECT org_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dsr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic updated_at
DROP TRIGGER IF EXISTS trigger_dsr_updated_at ON data_subject_requests;
CREATE TRIGGER trigger_dsr_updated_at
    BEFORE UPDATE ON data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_dsr_updated_at();

-- Grant permissions
GRANT ALL ON data_subject_requests TO authenticated;
GRANT ALL ON data_subject_requests TO service_role;

-- Comments for documentation
COMMENT ON TABLE data_subject_requests IS 'Stores data subject rights requests (GDPR/Privacy Law compliance)';
COMMENT ON COLUMN data_subject_requests.request_type IS 'Type of request: access, rectification, erasure, objection';
COMMENT ON COLUMN data_subject_requests.status IS 'Current status: pending, in_progress, completed, rejected';
COMMENT ON COLUMN data_subject_requests.deadline IS '30 days from request creation per Israeli Privacy Law';
