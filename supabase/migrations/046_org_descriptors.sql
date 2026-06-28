-- =============================================================================
-- 046_org_descriptors.sql
--
-- F2d: descriptive-data migration into the v3 ledger. Today F1/F2 renders read
-- the org's descriptive data (data categories, processing purposes, security
-- measures, DPO license) from the kept-legacy organization_profiles / dpos
-- tables. This adds a v3 home so the documents surface can become a PURE ledger
-- render: renders PREFER the ledger and FALL BACK to legacy when absent.
-- ADDITIVE / strangler: legacy organization_profiles + dpos stay byte-identical.
--
--   org_descriptors      - org-level descriptive data (one row per org).
--   contacts.license_number - the DPO's license, on the DPO contact (the ledger
--                          home; render falls back to dpos.license_number via
--                          organizations.dpo_id when null).
--
-- third_parties is NOT duplicated here - the ledger already holds vendors in
-- data_recipients (E3). RLS org-scoped (v3 pattern); anon ZERO grant.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.org_descriptors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  data_categories     jsonb NOT NULL DEFAULT '[]',
  processing_purposes jsonb NOT NULL DEFAULT '[]',
  security_measures   jsonb NOT NULL DEFAULT '[]',
  retention           text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_descriptors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_descriptors_org_scope ON public.org_descriptors;
CREATE POLICY org_descriptors_org_scope ON public.org_descriptors
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

REVOKE ALL ON public.org_descriptors FROM anon, PUBLIC;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.org_descriptors FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_descriptors TO authenticated;
GRANT ALL ON public.org_descriptors TO service_role;

-- The DPO's license on the DPO contact (v3 ledger home).
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS license_number text;

COMMIT;
