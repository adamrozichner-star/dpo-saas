-- =============================================================================
-- 040_dpo_queue_resolve.sql
--
-- Enables the C3 judgment-queue write path: the DPO resolves a dpo_queue item as
-- the authenticated user, under RLS (no service-role). Additive / forward.
--
-- 1. dpo_queue had only a SELECT policy, so RLS denied all client writes. Add an
--    org-scoped UPDATE policy (same scoping as the SELECT, via current_user_org_id()).
-- 2. events.entity_type CHECK did not include 'dpo_queue'; widen it so a queue
--    resolution can append an append-only events row. Existing rows unaffected.
-- 3. Hardening: dpo_queue granted full DML to anon (RLS-blocked, but the latent
--    "disable RLS -> anon exposed" risk). Now that it is an active write surface,
--    revoke anon entirely. authenticated/service_role unchanged.
-- =============================================================================

BEGIN;

CREATE POLICY dpo_queue_update_own_org ON public.dpo_queue
  FOR UPDATE TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

ALTER TABLE public.events DROP CONSTRAINT events_entity_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_entity_type_check
  CHECK (entity_type = ANY (ARRAY['obligation', 'control', 'task', 'evidence', 'asset', 'dpo_queue']));

REVOKE ALL ON public.dpo_queue FROM anon, PUBLIC;

COMMIT;
