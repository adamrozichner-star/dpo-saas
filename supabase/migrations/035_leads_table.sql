-- =============================================================================
-- 035_leads_table.sql
--
-- Backs the early-access lead form at /lead-signup (PR 3 of the
-- Deepo site-changes spec). Each submission stores a single row.
--
-- Write path: POST /api/leads (server-side, service_role).
-- Read path: future ops dashboard (none today).
--
-- -----------------------------------------------------------------------------
-- ACCESS MODEL — RLS ON, no policies, service_role bypasses
-- -----------------------------------------------------------------------------
-- service_role in Supabase has BYPASSRLS, so enabling RLS without any
-- policies blocks anon + authenticated entirely while still allowing
-- the API route's service-key writes to succeed.
--
-- This is the inverse of the regulatory_documents lesson
-- (memory/project_supabase_disable_rls_gotcha.md): there we had to
-- DISABLE RLS for a SECURITY DEFINER function that couldn't match any
-- policy. Here we have a direct INSERT from a service-role client —
-- BYPASSRLS handles it cleanly with no policy plumbing required.
--
-- Defaults from anon/authenticated are revoked explicitly (Supabase
-- auto-grants on public tables that RLS otherwise masks).
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. Table.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leads (
  id           uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  first_name   text        NOT NULL,
  phone        text        NOT NULL,
  association  text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- consent_at is captured server-side at submission time; the form
  -- checkbox confirms intent, this column records when.
  consent_at   timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);


-- -----------------------------------------------------------------------------
-- 2. RLS on (with no policies) — blocks anon + authenticated; service_role
--    has BYPASSRLS and writes succeed.
-- -----------------------------------------------------------------------------

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 3. Revoke default grants from anon / PUBLIC / authenticated.
--
-- Supabase auto-grants `ALTER DEFAULT PRIVILEGES ... GRANT ALL` on
-- new tables in `public` to anon + authenticated. With RLS those are
-- gated, but defense-in-depth: also revoke at the GRANT layer in case
-- RLS gets disabled later (we've been burned by this — see
-- memory/project_supabase_disable_rls_gotcha.md).
-- -----------------------------------------------------------------------------

REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.leads FROM PUBLIC;
REVOKE ALL ON public.leads FROM authenticated;


-- -----------------------------------------------------------------------------
-- 4. Verification
-- -----------------------------------------------------------------------------

-- (a) Table exists with expected columns.
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'leads'
 ORDER BY ordinal_position;
-- Expected: id (uuid, NO), first_name (text, NO), phone (text, NO),
--           association (text, NO), created_at (timestamptz, NO),
--           consent_at (timestamptz, NO)

-- (b) RLS is on.
SELECT rowsecurity
  FROM pg_tables
 WHERE schemaname = 'public' AND tablename = 'leads';
-- Expected: true

-- (c) anon / PUBLIC / authenticated have ZERO grants.
SELECT grantee, COUNT(*)::int AS grants
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public'
   AND table_name = 'leads'
   AND grantee IN ('anon', 'PUBLIC', 'authenticated')
 GROUP BY grantee;
-- Expected: zero rows (no grants for any of these)

COMMIT;
