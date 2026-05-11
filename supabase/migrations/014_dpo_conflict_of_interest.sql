-- =============================================================================
-- 014_dpo_conflict_of_interest.sql
--
-- Adds DPO conflict-of-interest tracking to public.organizations.
--
-- Background: Per Israeli privacy law (תיקון 13), a DPO (ממונה הגנת פרטיות)
-- cannot also serve as CEO, CISO, legal counsel, HR head, CFO, or HR director
-- of the same organization. The new columns let us detect this during
-- onboarding, surface it as a dashboard task, and disclose acknowledged
-- conflicts in the quarterly DPO report.
--
-- Apply manually after review:
--   psql "$SUPABASE_DB_URL" -f supabase/migrations/014_dpo_conflict_of_interest.sql
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS dpo_role_in_org TEXT
    CHECK (dpo_role_in_org IN (
      'none', 'ceo', 'ciso', 'legal', 'hr', 'cfo', 'hr_director', 'other'
    )),
  ADD COLUMN IF NOT EXISTS dpo_conflict_status TEXT NOT NULL DEFAULT 'not_assessed'
    CHECK (dpo_conflict_status IN (
      'not_assessed',
      'conflict_unresolved',
      'conflict_acknowledged',
      'no_conflict',
      'resolved_by_reassignment',
      'resolved_by_external_dpo'
    )),
  ADD COLUMN IF NOT EXISTS dpo_conflict_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dpo_conflict_acknowledged_by TEXT;

COMMENT ON COLUMN public.organizations.dpo_role_in_org IS
  'The additional role the org''s DPO holds (CEO/CISO/legal/HR/CFO/HR-director/other/none). NULL = not yet assessed.';
COMMENT ON COLUMN public.organizations.dpo_conflict_status IS
  'Lifecycle of the DPO conflict-of-interest assessment. Existing rows default to not_assessed and surface a one-time nudge on the dashboard.';
COMMENT ON COLUMN public.organizations.dpo_conflict_acknowledged_at IS
  'Timestamp when the user signed off on the disclaimer accepting the conflict. NULL unless dpo_conflict_status = conflict_acknowledged.';
COMMENT ON COLUMN public.organizations.dpo_conflict_acknowledged_by IS
  'Email of the user who signed off on the conflict disclaimer.';

-- =============================================================================
-- Verification
-- =============================================================================
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public'
--   AND  table_name  = 'organizations'
--   AND  column_name LIKE 'dpo_%';
-- =============================================================================
