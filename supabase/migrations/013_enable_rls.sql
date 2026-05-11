-- =============================================================================
-- 013_enable_rls.sql
--
-- P0 SECURITY FIX (2026-05-10): enable RLS on all tenant-data tables.
--
-- Audit confirmed RLS DISABLED in production on:
--   users, organizations, organization_profiles, documents,
--   subscriptions, audit_logs, calculator_leads_summary
-- Anyone with the public anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) could
-- SELECT/INSERT/UPDATE/DELETE every row in those tables.
--
-- This migration:
--   1. Enables RLS on all 7 tables (idempotent — safe to re-run).
--   2. Drops legacy SELECT-only policies from supabase/schema.sql:204-216.
--   3. Adds SELECT/INSERT/UPDATE policies scoped to the user's own org,
--      matching the actual client-side call sites in the dashboard,
--      onboarding, settings, auth-callback, etc.
--
-- The service role bypasses RLS automatically, so all server-side API
-- routes that use SUPABASE_SERVICE_ROLE_KEY (most of src/app/api/**) keep
-- working unchanged.
--
-- Apply manually after review:
--   psql "$SUPABASE_DB_URL" -f supabase/migrations/013_enable_rls.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Helper: SECURITY DEFINER function to look up the caller's org_id without
-- triggering RLS recursion when used in policies on the users table itself.
-- (A subquery on users from a users-policy USING clause would loop.)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

REVOKE ALL    ON FUNCTION public.current_user_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated, anon, service_role;


-- =============================================================================
-- 1. ENABLE RLS (idempotent — ALTER TABLE ... ENABLE RLS is a no-op if on).
-- =============================================================================
ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;

-- calculator_leads_summary: not present in any tracked migration. May be a
-- VIEW (RLS not applicable; it inherits from underlying tables) or a base
-- table created out-of-band. Detect and act accordingly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relname = 'calculator_leads_summary'
      AND  c.relkind = 'r'  -- 'r' = ordinary table
  ) THEN
    EXECUTE 'ALTER TABLE public.calculator_leads_summary ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'calculator_leads_summary: RLS enabled (base table, deny-all by default)';
  ELSIF EXISTS (
    SELECT 1
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relname = 'calculator_leads_summary'
      AND  c.relkind = 'v'  -- 'v' = view
  ) THEN
    RAISE NOTICE 'calculator_leads_summary is a VIEW — RLS not applicable. Verify the underlying base table has RLS, or REVOKE SELECT from anon/authenticated.';
  ELSE
    RAISE NOTICE 'calculator_leads_summary: object not found in public schema — skipping.';
  END IF;
END $$;


-- =============================================================================
-- 2. Drop legacy partial policies from schema.sql:204-216 (SELECT-only).
--    Plus any prior runs of this migration's own policy names, so re-applying
--    after a tweak is idempotent.
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own org"       ON public.organizations;
DROP POLICY IF EXISTS "Users can view own profile"   ON public.organization_profiles;
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;

DROP POLICY IF EXISTS users_select_self_or_org           ON public.users;
DROP POLICY IF EXISTS users_insert_self                  ON public.users;
DROP POLICY IF EXISTS users_update_self                  ON public.users;
DROP POLICY IF EXISTS organizations_select_own           ON public.organizations;
DROP POLICY IF EXISTS organizations_update_own           ON public.organizations;
DROP POLICY IF EXISTS organization_profiles_select_own   ON public.organization_profiles;
DROP POLICY IF EXISTS organization_profiles_insert_own   ON public.organization_profiles;
DROP POLICY IF EXISTS organization_profiles_update_own   ON public.organization_profiles;
DROP POLICY IF EXISTS documents_select_own               ON public.documents;
DROP POLICY IF EXISTS documents_update_own               ON public.documents;
DROP POLICY IF EXISTS subscriptions_select_own           ON public.subscriptions;
DROP POLICY IF EXISTS audit_logs_select_own              ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_own              ON public.audit_logs;


-- =============================================================================
-- 3. POLICIES
-- =============================================================================

-- ----------------------------------------------------------------------------
-- users
-- Client (anon-key + JWT) needs:
--   SELECT — own row + teammates in same org (settings list, dashboard joins)
--   INSERT — own row on first sign-in (auth/callback/page.tsx:105,
--            lib/auth-context.tsx:74)
--   UPDATE — own row only (settings/page.tsx:115, filtered by auth_user_id)
-- Uses current_user_org_id() helper to avoid policy recursion on this table.
-- ----------------------------------------------------------------------------
CREATE POLICY users_select_self_or_org ON public.users
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR org_id = public.current_user_org_id()
  );

CREATE POLICY users_insert_self ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING      (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- organizations
-- Client needs SELECT + UPDATE for own org (dashboard updates compliance_score
-- and data_flow_overrides; onboarding updates name/business_id).
-- INSERT/DELETE deliberately omitted — only the service role creates orgs
-- (api/cardcom/create-payment, api/complete-onboarding).
-- ----------------------------------------------------------------------------
CREATE POLICY organizations_select_own ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY organizations_update_own ON public.organizations
  FOR UPDATE TO authenticated
  USING      (id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- organization_profiles
-- Client needs SELECT + INSERT + UPDATE for own org's profile (dashboard,
-- onboarding, database-registration, DocCreator).
-- ----------------------------------------------------------------------------
CREATE POLICY organization_profiles_select_own ON public.organization_profiles
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY organization_profiles_insert_own ON public.organization_profiles
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY organization_profiles_update_own ON public.organization_profiles
  FOR UPDATE TO authenticated
  USING      (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- documents
-- No client-side reads detected today, but grant SELECT + UPDATE for own org
-- to cover near-term dashboard features and keep parity with other tables.
-- INSERT remains service-role only (API generates docs server-side).
-- ----------------------------------------------------------------------------
CREATE POLICY documents_select_own ON public.documents
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY documents_update_own ON public.documents
  FOR UPDATE TO authenticated
  USING      (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- subscriptions
-- Client needs SELECT only (use-subscription-gate.ts, dashboard, settings,
-- subscribe, payment-required, auth/callback). Inserts/updates by Cardcom
-- webhook run with service role.
-- ----------------------------------------------------------------------------
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- audit_logs
-- Client INSERTs at dashboard/page.tsx:397 (action_resolved). SELECT for
-- future audit-history views.
-- ----------------------------------------------------------------------------
CREATE POLICY audit_logs_select_own ON public.audit_logs
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY audit_logs_insert_own ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- calculator_leads_summary
-- Conservative posture: enable RLS (above) with NO policies — that gives
-- default-deny for both anon and authenticated roles. Service role still
-- bypasses, so any internal reader keeps working. If product later needs
-- client access, add a scoped SELECT policy here.
-- ----------------------------------------------------------------------------


-- =============================================================================
-- 4. Verification queries (run manually in psql / Supabase SQL editor)
-- =============================================================================
-- SELECT tablename, rowsecurity
-- FROM   pg_tables
-- WHERE  schemaname = 'public'
--   AND  tablename IN (
--          'users', 'organizations', 'organization_profiles', 'documents',
--          'subscriptions', 'audit_logs', 'calculator_leads_summary'
--        )
-- ORDER  BY tablename;
-- -- All rows should show rowsecurity = true.
--
-- SELECT schemaname, tablename, policyname, cmd, roles
-- FROM   pg_policies
-- WHERE  schemaname = 'public'
--   AND  tablename IN (
--          'users', 'organizations', 'organization_profiles', 'documents',
--          'subscriptions', 'audit_logs'
--        )
-- ORDER  BY tablename, policyname;
-- =============================================================================
