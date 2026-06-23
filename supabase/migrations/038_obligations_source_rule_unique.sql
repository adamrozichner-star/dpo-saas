-- =============================================================================
-- 038_obligations_source_rule_unique.sql
--
-- Additive. Supports the evaluator (B2): one obligation per (org, catalog rule),
-- so re-running the deterministic evaluator upserts instead of duplicating.
--
-- Partial unique index: applies only to obligations minted from a gap rule
-- (source_rule_id NOT NULL). Manually-created obligations (no source rule) are
-- unaffected and may repeat freely. source_version is intentionally NOT part of
-- the key: a new rule version updates the same obligation row (re-pinning its
-- provenance) rather than creating a second one.
-- =============================================================================

BEGIN;

CREATE UNIQUE INDEX uq_obligations_org_source_rule
  ON public.obligations (org_id, source_rule_id)
  WHERE source_rule_id IS NOT NULL;

COMMIT;
