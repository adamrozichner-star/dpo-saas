-- =============================================================================
-- 045_audit_packs.sql
--
-- F2a: Certify. An audit pack is a CERTIFICATION ARTIFACT - "the org was
-- certify-ready as of date X, and here is exactly what was certified" - so it is
-- a pinned snapshot, not a transient export (the same pin logic as F1 approved
-- docs). Generating a pack records one immutable row: the assembled markdown
-- content + a reproducible pack fingerprint + summary counts. ADDITIVE, idempotent.
--
-- IMMUTABILITY: authenticated gets INSERT + SELECT only (no UPDATE/DELETE policy),
-- so a recorded pack's content cannot be changed - the snapshot holds even as the
-- ledger moves on. RLS org-scoped (DPO own org; cross-org denied). anon ZERO grant.
--
-- PII-FREE (same discipline as dsar_requests): the snapshot is org-compliance data
-- assembled from obligations/evidence/controls/F1 docs. E2/E3 evidence is
-- sysadmin/vendor technical answers; DSAR subject PII never entered the ledger
-- (E4). No subject-PII column or path. Controller-identity-in-header is Roy-gated
-- in the assembler, same as F1.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_packs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  generated_at     timestamptz NOT NULL DEFAULT now(),
  generated_by     uuid,                       -- the DPO's user id (no FK: DPO may live in users or dpos)
  pack_fingerprint text NOT NULL,              -- reproducible hash of the canonical assembled inputs
  content          text NOT NULL,              -- the assembled markdown snapshot (what was certified)
  summary          jsonb NOT NULL DEFAULT '{}' -- counts: obligations / evidence / controls / docs
);

CREATE INDEX IF NOT EXISTS audit_packs_org_id_idx ON public.audit_packs (org_id, generated_at DESC);

ALTER TABLE public.audit_packs ENABLE ROW LEVEL SECURITY;

-- DPO reads + records own-org packs. No UPDATE/DELETE policy -> the snapshot is
-- immutable by RLS (a certificate cannot be silently rewritten).
DROP POLICY IF EXISTS audit_packs_org_select ON public.audit_packs;
CREATE POLICY audit_packs_org_select ON public.audit_packs
  FOR SELECT TO authenticated USING (org_id = current_user_org_id());

DROP POLICY IF EXISTS audit_packs_org_insert ON public.audit_packs;
CREATE POLICY audit_packs_org_insert ON public.audit_packs
  FOR INSERT TO authenticated WITH CHECK (org_id = current_user_org_id());

-- anon ZERO; authenticated SELECT+INSERT only; service_role full (convention).
REVOKE ALL ON public.audit_packs FROM anon, PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.audit_packs FROM authenticated;
GRANT SELECT, INSERT ON public.audit_packs TO authenticated;
GRANT ALL ON public.audit_packs TO service_role;

COMMIT;
