-- Document Reviews table for file upload & DPO review flow
CREATE TABLE IF NOT EXISTS document_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    -- Original document
    original_filename VARCHAR(255) NOT NULL,
    original_file_url TEXT,
    original_file_type VARCHAR(50), -- pdf, docx, txt
    original_content TEXT, -- extracted text content
    
    -- AI Review
    ai_review_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    ai_review_summary TEXT,
    ai_issues_found JSONB DEFAULT '[]', -- [{severity, issue, suggestion, location}]
    ai_risk_score INTEGER, -- 0-100
    ai_reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- DPO Review (paid upsell)
    dpo_review_requested BOOLEAN DEFAULT FALSE,
    dpo_review_status VARCHAR(20), -- pending, in_progress, completed
    dpo_review_price DECIMAL(10,2),
    dpo_reviewer_id UUID,
    dpo_notes TEXT,
    dpo_reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Output document
    reviewed_file_url TEXT,
    reviewed_content TEXT,
    
    -- Metadata
    review_type VARCHAR(50), -- contract, policy, consent_form, other
    urgency VARCHAR(20) DEFAULT 'normal', -- normal, urgent
    status VARCHAR(20) DEFAULT 'uploaded', -- uploaded, ai_reviewed, dpo_pending, dpo_reviewed, completed
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_document_reviews_org ON document_reviews(org_id);
CREATE INDEX IF NOT EXISTS idx_document_reviews_status ON document_reviews(status);
CREATE INDEX IF NOT EXISTS idx_document_reviews_dpo_pending ON document_reviews(dpo_review_status) WHERE dpo_review_requested = TRUE;

-- RLS policies
ALTER TABLE document_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org document reviews"
ON document_reviews FOR SELECT
USING (org_id IN (
    SELECT org_id FROM users WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can insert document reviews for own org"
ON document_reviews FOR INSERT
WITH CHECK (org_id IN (
    SELECT org_id FROM users WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can update own org document reviews"
ON document_reviews FOR UPDATE
USING (org_id IN (
    SELECT org_id FROM users WHERE auth_user_id = auth.uid()
));

-- DPO Review Pricing table
CREATE TABLE IF NOT EXISTS review_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_type VARCHAR(50) NOT NULL,
    name_he VARCHAR(100) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    urgent_multiplier DECIMAL(3,2) DEFAULT 1.5,
    description_he TEXT,
    estimated_hours DECIMAL(4,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO review_pricing (review_type, name_he, base_price, description_he, estimated_hours) VALUES
('contract', 'בדיקת חוזה', 350, 'בדיקת חוזה מול צד שלישי לעמידה בדרישות פרטיות', 1),
('policy', 'בדיקת מדיניות', 450, 'בדיקה ועדכון מדיניות פרטיות או אבטחת מידע', 1.5),
('consent_form', 'טופס הסכמה', 250, 'בדיקת טופס הסכמה או הרשאה', 0.5),
('dpia', 'הערכת השפעה (DPIA)', 1500, 'הערכת השפעה על פרטיות לפרויקט חדש', 5),
('incident', 'אירוע אבטחה', 800, 'ליווי וייעוץ באירוע אבטחת מידע', 3),
('other', 'בדיקה כללית', 300, 'בדיקת מסמך אחר', 1)
ON CONFLICT DO NOTHING;
