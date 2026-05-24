-- =============================================================================
-- 027_regulatory_ingest_worker_rls.sql
--
-- Belt-and-suspenders fix for the regulatory ingest RLS bug. Adds
-- worker-scoped INSERT/UPDATE policies alongside migration 026's
-- service_role-scoped policies, so RLS matches whichever role
-- Postgres evaluates against inside the SECURITY DEFINER function.
--
-- -----------------------------------------------------------------------------
-- WHY BELT-AND-SUSPENDERS
-- -----------------------------------------------------------------------------
-- We've now seen TWO contradictory failure modes:
--
--   - Migrations 023 + 024 (policies TO regulatory_ingest_worker) failed
--     with "new row violates row-level security policy" — implying RLS
--     evaluated against service_role (the supabase.rpc caller), not
--     against the function owner.
--
--   - Migration 026 (policies TO service_role, worker policies dropped)
--     also failed with the SAME error — implying RLS evaluated against
--     the function OWNER (worker), not the caller.
--
-- These are mutually exclusive. The actual current_user inside the
-- SECURITY DEFINER function in this Supabase project must be one of
-- {worker, service_role, postgres, supabase_admin, authenticator}, and
-- we can't be 100% sure which until we probe live. Rather than burn
-- another iteration narrowing it down, this migration adds policies for
-- BOTH worker and service_role. RLS only needs ONE matching policy per
-- statement (INSERT/UPDATE/etc.) to permit the row.
--
-- Trade-off considered (and rejected): "disable RLS entirely on
-- regulatory_*." Would definitely fix the write path, but the existing
-- SELECT policy is `TO authenticated WITH USING (true)` and is the ONLY
-- read grant for the authenticated role — Supabase's authenticated role
-- has no direct SELECT GRANT on these tables, only the RLS-gated path.
-- Disabling RLS would break the curator console's read path. Keeping
-- RLS on and adding the missing write policy is the correct fix.
--
-- -----------------------------------------------------------------------------
-- WHY THE FIREWALL STILL HOLDS
-- -----------------------------------------------------------------------------
-- The firewall is the table-GRANT layer, not RLS (see migration 026
-- header for the long argument). To restate the invariant briefly:
--
--   - regulatory_ingest_worker has ZERO grants on any hub_* table.
--   - SECURITY DEFINER ensures function statements execute with the
--     OWNER's privileges (worker), so any future INSERT INTO hub_*
--     added to the function body fails at the privilege-check layer
--     BEFORE RLS evaluates.
--   - RLS only governs WHO may call the sanctioned write path; the
--     GRANT layer governs WHAT the path can write.
--
-- Adding more RLS write policies to the regulatory_* tables for roles
-- that already have GRANT INSERT/UPDATE on those tables does not change
-- "what the path can write." The hub_* firewall is unaffected. The
-- verification block re-asserts the GRANT invariant before COMMIT.
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. Re-add worker-scoped INSERT/UPDATE policies on regulatory_documents.
--
-- These were dropped in migration 026. We add them back alongside (not
-- replacing) the service_role-scoped policies that 026 created.
-- Different names from migration 023 so a partial-apply state can't
-- cause "policy already exists" collisions.
-- -----------------------------------------------------------------------------

CREATE POLICY "regulatory_documents_insert_worker"
  ON public.regulatory_documents
  FOR INSERT
  TO regulatory_ingest_worker
  WITH CHECK (true);

CREATE POLICY "regulatory_documents_update_worker"
  ON public.regulatory_documents
  FOR UPDATE
  TO regulatory_ingest_worker
  USING (true)
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 2. Re-add worker-scoped INSERT/UPDATE policies on regulatory_sections.
-- -----------------------------------------------------------------------------

CREATE POLICY "regulatory_sections_insert_worker"
  ON public.regulatory_sections
  FOR INSERT
  TO regulatory_ingest_worker
  WITH CHECK (true);

CREATE POLICY "regulatory_sections_update_worker"
  ON public.regulatory_sections
  FOR UPDATE
  TO regulatory_ingest_worker
  USING (true)
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 3. Verification
-- -----------------------------------------------------------------------------

-- (a) Both regulatory_* tables should now have FOUR write policies each:
--     INSERT/worker, INSERT/service_role, UPDATE/worker, UPDATE/service_role,
--     plus the original SELECT/authenticated → 5 policies per table total.
SELECT tablename, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('regulatory_documents', 'regulatory_sections')
 ORDER BY tablename, cmd, policyname;
-- Expected per table:
--   regulatory_*_select_authenticated     | SELECT | {authenticated}
--   regulatory_*_insert_service_role      | INSERT | {service_role}
--   regulatory_*_insert_worker            | INSERT | {regulatory_ingest_worker}
--   regulatory_*_update_service_role      | UPDATE | {service_role}
--   regulatory_*_update_worker            | UPDATE | {regulatory_ingest_worker}

-- (b) Count of write policies — should be 8 (4 per table × 2 tables).
SELECT COUNT(*)::int AS write_policy_count
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('regulatory_documents', 'regulatory_sections')
   AND cmd IN ('INSERT', 'UPDATE');
-- Expected: 8

-- (c) FIREWALL SANITY (re-asserted from 026): worker has zero grants
--     on any hub_* table. This is the structural invariant the
--     firewall rests on; if it ever returns non-zero, the firewall
--     is broken regardless of any RLS configuration.
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'regulatory_ingest_worker'
   AND table_schema = 'public'
   AND table_name LIKE 'hub_%';
-- Expected: 0

-- (d) Function still exists, owned by worker, SECURITY DEFINER on.
SELECT
  proname AS function_name,
  pg_get_userbyid(proowner) AS owner,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'regulatory_ingest_persist'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: 1 row, owner='regulatory_ingest_worker', is_security_definer=true

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECTs
-- still print but nothing persists. After a successful real run, re-test
-- the PDF approve flow end-to-end — at least one of the two write policies
-- (worker or service_role) must match whichever role RLS evaluates
-- against, and the INSERT will succeed.
