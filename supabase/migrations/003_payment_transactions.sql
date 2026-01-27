-- Migration: Add payment transactions table
-- Run this migration to enable HYP payment tracking

-- ============================================
-- PAYMENT TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(100) PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  plan VARCHAR(20) NOT NULL,
  is_annual BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  hyp_transaction_id VARCHAR(100),
  hyp_status VARCHAR(20),
  hyp_status_text TEXT,
  error_code VARCHAR(50),
  error_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_org_id ON payment_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

-- ============================================
-- ORGANIZATIONS TABLE UPDATES
-- ============================================

-- Add subscription tracking fields if not exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS last_payment_amount INTEGER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their organization's transactions
CREATE POLICY "Users can view own org transactions" ON payment_transactions
  FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  );

-- Only service role can insert/update (webhook)
CREATE POLICY "Service role can manage transactions" ON payment_transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- VERIFICATION
-- ============================================
-- Uncomment to verify:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payment_transactions';
