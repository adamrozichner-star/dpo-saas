-- =============================================================================
-- 044_documents_ledger_render.sql
--
-- Phase F1: documents as ledger renders. A v3 document is a deterministic render
-- of ledger state (source='ledger_render'), pinned at approval with the render
-- fingerprint + the template version it came from, so the DPO is flagged when the
-- ledger moves past an approved doc. ADDITIVE only, idempotent.
--
-- COEXISTENCE: the legacy documents stack (/api/generate-documents, the AI
-- generator, document_reviews, and the existing legacy rows) is UNTOUCHED. v3
-- renders are marked source='ledger_render'; everything here is additive +
-- source-scoped. The new columns are nullable so legacy rows are unaffected.
--
-- SECURITY: documents already had SELECT + UPDATE policies for authenticated
-- (org-scoped) but NO INSERT policy - legacy inserts went via service-role. F1
-- writes are RLS-scoped (the v3 pattern), so add an org-scoped INSERT policy.
-- documents also carried the latent broad anon DML grant; revoke anon write
-- access now that it is an active v3 write surface (the 040/041 hardening).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Pin columns (all nullable; legacy rows unaffected). source already exists.
-- -----------------------------------------------------------------------------
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS render_fingerprint text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS template_id        uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS template_version   integer;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS approved_at        timestamptz;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS approved_by        uuid;  -- approving user's id (no FK: DPO may live in users or dpos)

-- -----------------------------------------------------------------------------
-- 2. RLS INSERT policy for the v3 write path (org-scoped, authenticated). The
--    existing SELECT/UPDATE org policies stay; this only adds INSERT.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS documents_insert_own ON public.documents;
CREATE POLICY documents_insert_own ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (org_id = current_user_org_id());

-- -----------------------------------------------------------------------------
-- 3. Close the latent anon DML grant (documents is now an active v3 write
--    surface). Revoke anon write access; authenticated/service_role unchanged.
--    (SELECT is left as-is - anon has no SELECT policy, so RLS blocks reads
--    regardless; we only harden the write grants the gate asks about.)
-- -----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.documents FROM anon;

COMMIT;
