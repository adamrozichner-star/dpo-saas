-- =============================================================================
-- 029_regulatory_revoke_anon.sql
--
-- SECURITY FIX following migration 028.
--
-- Migration 028 disabled RLS on regulatory_documents and regulatory_sections
-- because RLS was blocking the SECURITY DEFINER ingest function. The
-- verification block on 028 then revealed that the `anon` role has 14
-- privileges across these two tables — left over from Supabase's
-- default `GRANT ... TO anon` behavior on tables in public.
--
-- With RLS off and those default grants in place, anon (anonymous
-- traffic via PostgREST) could read AND WRITE to the regulatory tables.
-- Read is mostly harmless (regulatory text is public material), but
-- WRITE access is a vandalism risk that must be closed before any
-- further use of the application.
--
-- Same risk applies to PUBLIC role grants. Same fix.
--
-- We also tighten `authenticated` to SELECT-only — curators should
-- never write to these tables directly via PostgREST; the only
-- sanctioned write path is the API route → service_role.rpc →
-- regulatory_ingest_persist function.
--
-- -----------------------------------------------------------------------------
-- WHAT THIS PRESERVES
-- -----------------------------------------------------------------------------
-- - service_role retains INSERT/UPDATE/SELECT (used by supabase.rpc
--   from the API route)
-- - regulatory_ingest_worker retains INSERT/UPDATE/SELECT (function
--   owner, executes statements under SECURITY DEFINER)
-- - authenticated retains SELECT only (curator UI reads via the
--   PostgREST + authenticated JWT path)
-- - anon and PUBLIC get nothing
-- - RLS stays disabled — the GRANT layer alone is the access control,
--   which is exactly the model 028 documented
-- - Firewall unchanged: worker still has ZERO grants on any hub_* table
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. Revoke ALL from anon, PUBLIC, and authenticated on both tables.
--
-- We revoke from authenticated too so we have a clean baseline before
-- re-granting exactly SELECT. Cheaper than reasoning about what subset
-- of privileges Supabase's defaults left in place.
-- -----------------------------------------------------------------------------

REVOKE ALL PRIVILEGES ON public.regulatory_documents FROM anon;
REVOKE ALL PRIVILEGES ON public.regulatory_documents FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.regulatory_documents FROM authenticated;

REVOKE ALL PRIVILEGES ON public.regulatory_sections FROM anon;
REVOKE ALL PRIVILEGES ON public.regulatory_sections FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.regulatory_sections FROM authenticated;


-- -----------------------------------------------------------------------------
-- 2. Re-grant SELECT to authenticated (curator console read path).
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.regulatory_documents TO authenticated;
GRANT SELECT ON public.regulatory_sections  TO authenticated;


-- -----------------------------------------------------------------------------
-- 3. Verification
-- -----------------------------------------------------------------------------

-- (a) anon has ZERO grants on both regulatory_* tables.
SELECT COUNT(*)::int AS anon_regulatory_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'anon'
   AND table_schema = 'public'
   AND table_name IN ('regulatory_documents', 'regulatory_sections');
-- Expected: 0  (was 14 before this migration)

-- (b) PUBLIC has ZERO grants.
SELECT COUNT(*)::int AS public_regulatory_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'PUBLIC'
   AND table_schema = 'public'
   AND table_name IN ('regulatory_documents', 'regulatory_sections');
-- Expected: 0

-- (c) authenticated has exactly SELECT on both tables, nothing else.
SELECT table_name, privilege_type
  FROM information_schema.role_table_grants
 WHERE grantee = 'authenticated'
   AND table_schema = 'public'
   AND table_name IN ('regulatory_documents', 'regulatory_sections')
 ORDER BY table_name, privilege_type;
-- Expected: 2 rows, both SELECT, no INSERT/UPDATE/DELETE/etc.

-- (d) Write path preserved: worker and service_role still have
--     INSERT and UPDATE on both tables.
SELECT grantee, table_name, privilege_type
  FROM information_schema.role_table_grants
 WHERE grantee IN ('regulatory_ingest_worker', 'service_role')
   AND table_schema = 'public'
   AND table_name IN ('regulatory_documents', 'regulatory_sections')
   AND privilege_type IN ('INSERT', 'UPDATE', 'SELECT')
 ORDER BY table_name, grantee, privilege_type;
-- Expected: at minimum INSERT+UPDATE+SELECT for worker on both tables

-- (e) FIREWALL SANITY: worker still has ZERO grants on any hub_* table.
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'regulatory_ingest_worker'
   AND table_schema = 'public'
   AND table_name LIKE 'hub_%';
-- Expected: 0

-- (f) RLS still off on both tables (we did not re-enable; the
--     ingest function still needs the unblocked write path).
SELECT tablename, rowsecurity
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('regulatory_documents', 'regulatory_sections')
 ORDER BY tablename;
-- Expected: rowsecurity=false for both

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECTs
-- still print but nothing persists. After a successful real run:
--   1. Re-test PDF approve — should still succeed (write path unchanged).
--   2. Re-test curator console reads — should still see existing docs.
--   3. As a manual sanity check: try hitting GET /rest/v1/regulatory_documents
--      with the anon key — should return permission denied.
