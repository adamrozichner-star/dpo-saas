-- =============================================================================
-- 048_org_descriptor_address.sql
--
-- ② Controller identity in regulator-facing docs (Roy, 2026-06-29): when a doc is
-- in the context of the report to the Authority, it MUST carry the controller's
-- details (name / business id / address). name + business_id already live on
-- organizations; this adds the missing address as a NULLABLE field on the F2d
-- descriptive layer (org_descriptors) - NOT a new schema path.
--
-- No capture UI yet: the field is populated directly for the pilot org; a settings
-- UI is post-pilot. Additive / strangler - existing rows + RLS unchanged
-- (org_descriptors already: authenticated FOR ALL org-scoped, anon ZERO grant).
-- =============================================================================

ALTER TABLE public.org_descriptors ADD COLUMN IF NOT EXISTS address text;
