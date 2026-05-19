-- Migration 016: Cardcom idempotency + missing webhook columns
--
-- Background:
-- The Cardcom webhook handler (src/app/api/cardcom/webhook/route.ts) updates
-- payment_transactions with 10 columns that were never declared in the original
-- schema (migration 003). PostgREST rejects those UPDATEs, so payment rows have
-- been stuck in 'pending' status while the linked organizations row was activated.
--
-- This migration:
--   1. Adds the 10 missing columns so the webhook UPDATE persists correctly.
--   2. Adds a partial UNIQUE index on lowprofile_code (Cardcom's per-checkout key)
--      so duplicate webhook deliveries can't create duplicate rows and so the
--      webhook can use it as an idempotency key.

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS lowprofile_code            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cardcom_transaction_id     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cardcom_approval_number    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS card_token                 TEXT,
  ADD COLUMN IF NOT EXISTS card_mask                  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS card_expiry                VARCHAR(10),
  ADD COLUMN IF NOT EXISTS card_brand                 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS invoice_number             VARCHAR(50),
  ADD COLUMN IF NOT EXISTS error_message              TEXT,
  ADD COLUMN IF NOT EXISTS cardcom_response           TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_lowprofile_code_uq
  ON payment_transactions (lowprofile_code)
  WHERE lowprofile_code IS NOT NULL;

COMMENT ON COLUMN payment_transactions.lowprofile_code IS 'Cardcom LowProfileId — unique per checkout session, used as idempotency key for webhook deduplication';
