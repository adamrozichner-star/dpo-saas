-- =============================================================================
-- 039_controls_source_playbook_unique.sql
--
-- Additive. Supports the control instantiator (B3): one control per
-- (org, catalog playbook version), so re-running instantiation upserts the same
-- control instead of duplicating. Same pattern as 038 for obligations.
--
-- All three key columns are NOT NULL on controls (a control always instantiates
-- a specific playbook version), so a plain unique index is correct here - no
-- partial predicate needed.
-- =============================================================================

BEGIN;

CREATE UNIQUE INDEX uq_controls_org_source_playbook
  ON public.controls (org_id, source_playbook_id, source_playbook_version);

COMMIT;
