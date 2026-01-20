-- DPO-as-a-Service Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE org_status AS ENUM ('onboarding', 'active', 'suspended');
CREATE TYPE risk_level AS ENUM ('standard', 'sensitive', 'high');
CREATE TYPE subscription_tier AS ENUM ('basic', 'extended');
CREATE TYPE document_type AS ENUM ('privacy_policy', 'database_registration', 'security_policy', 'procedure', 'custom');
CREATE TYPE document_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE user_role AS ENUM ('admin', 'employee', 'viewer');
CREATE TYPE escalation_type AS ENUM ('qa', 'incident', 'review', 'custom');
CREATE TYPE escalation_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE escalation_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled');
CREATE TYPE actor_type AS ENUM ('user', 'dpo', 'system', 'ai');

-- DPOs table
CREATE TABLE dpos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    max_clients INTEGER DEFAULT 500,
    active_clients INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    business_id VARCHAR(20) NOT NULL,
    tier subscription_tier DEFAULT 'basic',
    status org_status DEFAULT 'onboarding',
    risk_level risk_level DEFAULT 'standard',
    dpo_id UUID REFERENCES dpos(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization profiles table
CREATE TABLE organization_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    business_type VARCHAR(100),
    employee_count INTEGER,
    data_types JSONB DEFAULT '[]',
    processing_purposes JSONB DEFAULT '[]',
    databases JSONB DEFAULT '[]',
    third_parties JSONB DEFAULT '[]',
    security_measures JSONB DEFAULT '[]',
    profile_version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'employee',
    auth_user_id UUID UNIQUE, -- Links to Supabase Auth
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    version INTEGER DEFAULT 1,
    status document_status DEFAULT 'draft',
    generated_by VARCHAR(20) DEFAULT 'ai',
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document versions table
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Q&A interactions table
CREATE TABLE qa_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    question TEXT NOT NULL,
    answer TEXT,
    confidence_score DECIMAL(3,2),
    escalated BOOLEAN DEFAULT FALSE,
    escalation_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Escalations table
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type escalation_type DEFAULT 'qa',
    priority escalation_priority DEFAULT 'medium',
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status escalation_status DEFAULT 'open',
    dpo_time_minutes INTEGER DEFAULT 0,
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key to qa_interactions
ALTER TABLE qa_interactions 
ADD CONSTRAINT fk_escalation 
FOREIGN KEY (escalation_id) REFERENCES escalations(id);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    tier subscription_tier DEFAULT 'basic',
    monthly_price DECIMAL(10,2) NOT NULL,
    dpo_minutes_quota INTEGER DEFAULT 30,
    dpo_minutes_used INTEGER DEFAULT 0,
    billing_cycle_start DATE DEFAULT CURRENT_DATE,
    status subscription_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table (mock for now)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ILS',
    type VARCHAR(20) DEFAULT 'subscription',
    status VARCHAR(20) DEFAULT 'completed',
    gateway_ref VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    actor_id UUID,
    actor_type actor_type DEFAULT 'system',
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding answers table
CREATE TABLE onboarding_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_organizations_dpo ON organizations(dpo_id);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_qa_org ON qa_interactions(org_id);
CREATE INDEX idx_escalations_org ON escalations(org_id);
CREATE INDEX idx_escalations_status ON escalations(status);
CREATE INDEX idx_audit_org ON audit_logs(org_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize based on your auth setup)
-- Users can only see their own organization's data
CREATE POLICY "Users can view own org" ON organizations
    FOR SELECT USING (
        id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can view own profile" ON organization_profiles
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
    );

-- Functions
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalations_updated_at
    BEFORE UPDATE ON escalations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default DPO
INSERT INTO dpos (name, email, license_number, max_clients, active_clients)
VALUES ('עו"ד דנה כהן', 'dana@dpo-service.co.il', 'DPO-2024-001', 500, 0);

-- Function to generate documents on onboarding completion
CREATE OR REPLACE FUNCTION generate_initial_documents(p_org_id UUID)
RETURNS VOID AS $$
DECLARE
    v_org organizations%ROWTYPE;
BEGIN
    SELECT * INTO v_org FROM organizations WHERE id = p_org_id;
    
    -- Create privacy policy
    INSERT INTO documents (org_id, type, title, content, status, generated_by)
    VALUES (p_org_id, 'privacy_policy', 'מדיניות פרטיות', 'תוכן המדיניות יוזן ע"י AI', 'active', 'ai');
    
    -- Create security policy
    INSERT INTO documents (org_id, type, title, content, status, generated_by)
    VALUES (p_org_id, 'security_policy', 'מדיניות אבטחת מידע', 'תוכן המדיניות יוזן ע"י AI', 'active', 'ai');
    
    -- Create database registration
    INSERT INTO documents (org_id, type, title, content, status, generated_by)
    VALUES (p_org_id, 'database_registration', 'רישום מאגר מידע', 'תוכן הרישום יוזן ע"י AI', 'active', 'ai');
    
    -- Update org status
    UPDATE organizations SET status = 'active' WHERE id = p_org_id;
    
    -- Log the action
    INSERT INTO audit_logs (org_id, action, entity_type, entity_id, actor_type, details)
    VALUES (p_org_id, 'documents_generated', 'organization', p_org_id, 'system', '{"documents_count": 3}');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Data Subject Rights Requests Table
-- =============================================
CREATE TYPE request_type AS ENUM ('access', 'rectification', 'erasure', 'objection');
CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');

CREATE TABLE data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    request_type request_type NOT NULL,
    status request_status DEFAULT 'pending',
    requester_name VARCHAR(255) NOT NULL,
    requester_id VARCHAR(20) NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_phone VARCHAR(20),
    details TEXT,
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by VARCHAR(255),
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dsr_org ON data_subject_requests(org_id);
CREATE INDEX idx_dsr_status ON data_subject_requests(status);
CREATE INDEX idx_dsr_deadline ON data_subject_requests(deadline);
CREATE INDEX idx_dsr_request_number ON data_subject_requests(request_number);

-- RLS for data_subject_requests
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org requests" ON data_subject_requests
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Public can insert requests" ON data_subject_requests
    FOR INSERT WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_dsr_updated_at
    BEFORE UPDATE ON data_subject_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Message Threads Table (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL,
    sender_id UUID,
    sender_name VARCHAR(255),
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_org ON message_threads(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
