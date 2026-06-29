-- =============================================================================
-- 047_org_descriptors_counts.sql
--
-- PR12: ledger-back the last ancillary compliance stats. dbCount/totalRecords had
-- no clean ledger home (the v3 assets table is sparse), so extend org_descriptors
-- (the F2d descriptive home) with db_count + total_records. The F2d migrate copy
-- populates them from the legacy organization_profiles; buildLedgerSummary then
-- reads them ledger-side instead of the hardcoded 0 defaults. ADDITIVE, idempotent.
--
-- totalRecords is inherently fuzzy (onboarding size-buckets) - a ledger-consistent
-- home is the point, not exactness. Legacy organization_profiles stays byte-identical.
-- =============================================================================

BEGIN;

ALTER TABLE public.org_descriptors ADD COLUMN IF NOT EXISTS db_count      integer NOT NULL DEFAULT 0;
ALTER TABLE public.org_descriptors ADD COLUMN IF NOT EXISTS total_records integer NOT NULL DEFAULT 0;

COMMIT;
