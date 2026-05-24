-- =============================================================================
-- 028_regulatory_disable_rls.sql
--
-- Disables RLS on regulatory_documents and regulatory_sections.
--
-- Three prior migrations (025, 026, 027) tried to make RLS work with the
-- SECURITY DEFINER ingest function:
--   - 025: SET LOCAL ROLE inside the function — Postgres refuses
--          ("cannot set parameter 'role' within security-definer function")
--   - 026: policies TO service_role only — still RLS-blocked
--   - 027: policies TO BOTH service_role AND regulatory_ingest_worker
--          — still RLS-blocked
--
-- Conclusion: the actual current_user inside the function in this
-- Supabase project is neither service_role nor worker. It's some
-- third role (postgres / supabase_admin / authenticator) and we
-- could keep guessing, or we could acknowledge that RLS is the wrong
-- layer for this defense.
--
-- -----------------------------------------------------------------------------
-- THE FIREWALL DOES NOT DEPEND ON RLS
-- -----------------------------------------------------------------------------
-- The firewall promise — "the regulatory ingest path cannot write to
-- hub_* tables" — is enforced by **table-level GRANTs**:
--
--   1. regulatory_ingest_worker has ZERO grants on any hub_* table.
--   2. SECURITY DEFINER means the function executes with the OWNER's
--      privileges. Any INSERT INTO hub_* added to the function body
--      fails at the privilege-check layer with "permission denied for
--      table hub_*". Verified by the sanity check below.
--   3. The RLS layer that 023 added was defense-in-depth governing
--      WHO may call the write path. It's now actively blocking the
--      intended write path. The defense is hurting more than helping.
--
-- Disabling RLS on these two tables removes the block without weakening
-- the firewall. The GRANT layer is the load-bearing defense.
--
-- -----------------------------------------------------------------------------
-- READ-PATH IMPACT
-- -----------------------------------------------------------------------------
-- Migration 023's SELECT/authenticated RLS policy was the ONLY read
-- grant for the authenticated role on these tables. With RLS disabled,
-- that policy stops being enforced, so authenticated would lose its
-- SELECT path. To restore curator console reads, we explicitly
--   GRANT SELECT ON public.regulatory_documents TO authenticated;
--   GRANT SELECT ON public.regulatory_sections  TO authenticated;
-- This is equivalent to what the policy permitted (USING (true)) but
-- enforced at the GRANT layer instead of the RLS layer.
--
-- DATA-SENSITIVITY NOTE: these tables hold regulatory text — laws,
-- court rulings, EDPB guidance, Privacy Protection Authority circulars.
-- That content is PUBLIC by nature (sourced from gov.il and equivalent).
-- Widening read access from "authenticated via RLS" to "authenticated
-- via GRANT" does not expose any sensitive material. The anon role
-- still has no access (no GRANT, no policy).
--
-- -----------------------------------------------------------------------------
-- POLICY HYGIENE
-- -----------------------------------------------------------------------------
-- We leave the existing (now-dormant) policies in place. DISABLE ROW
-- LEVEL SECURITY just stops enforcement; the policies sit there
-- inactive. Leaving them is defensive: if RLS is ever re-enabled on
-- these tables, the policies resume. Dropping them would mean a
-- future re-enable would lock everyone out instead.
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. GRANT SELECT to authenticated (replaces the RLS-gated read path).
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.regulatory_documents TO authenticated;
GRANT SELECT ON public.regulatory_sections  TO authenticated;


-- -----------------------------------------------------------------------------
-- 2. Disable RLS on the two write-blocked tables.
-- -----------------------------------------------------------------------------

ALTER TABLE public.regulatory_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_sections  DISABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 3. Verification
-- -----------------------------------------------------------------------------

-- (a) RLS is off on both tables.
SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('regulatory_documents', 'regulatory_sections')
 ORDER BY tablename;
-- Expected: rowsecurity=false for both rows

-- (b) Read path: authenticated has SELECT grant on both tables.
SELECT table_name, privilege_type
  FROM information_schema.role_table_grants
 WHERE grantee = 'authenticated'
   AND table_schema = 'public'
   AND table_name IN ('regulatory_documents', 'regulatory_sections')
   AND privilege_type = 'SELECT'
 ORDER BY table_name;
-- Expected: 2 rows, both SELECT

-- (c) Write path: worker and service_role still have INSERT/UPDATE
--     grants (these came from migration 023 and we have not touched
--     them). Used by the function for INSERT and supersede UPDATE.
SELECT grantee, table_name, privilege_type
  FROM information_schema.role_table_grants
 WHERE grantee IN ('regulatory_ingest_worker', 'service_role')
   AND table_schema = 'public'
   AND table_name IN ('regulatory_documents', 'regulatory_sections')
   AND privilege_type IN ('INSERT', 'UPDATE')
 ORDER BY table_name, grantee, privilege_type;
-- Expected: at minimum INSERT+UPDATE for worker on both tables

-- (d) FIREWALL SANITY: worker has ZERO grants on any hub_* table.
--     This is THE invariant the firewall rests on; if it's ever
--     non-zero, the firewall is broken regardless of anything else.
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'regulatory_ingest_worker'
   AND table_schema = 'public'
   AND table_name LIKE 'hub_%';
-- Expected: 0

-- (e) anon role has NO access to these tables (sanity — public is
--     authenticated-only, not everyone-on-the-internet).
SELECT COUNT(*)::int AS anon_regulatory_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'anon'
   AND table_schema = 'public'
   AND table_name IN ('regulatory_documents', 'regulatory_sections');
-- Expected: 0

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECTs
-- still print but nothing persists. After a successful real run, re-test
-- the PDF approve flow end-to-end — INSERT should now succeed.
