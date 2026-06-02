-- =============================================================================
-- 036_leads_company_marketing.sql
--
-- Adds optional company name + marketing-consent fields to public.leads.
-- Backs the /lead-signup form additions: an optional 'שם החברה / העסק'
-- input between the association field and the consent area, plus a
-- separate marketing-consent checkbox below the required privacy consent.
--
-- The marketing consent is SEPARATE from the existing required consent —
-- per privacy-by-design, contact/processing consent (required, gates
-- submit) must not be bundled with marketing consent (optional). Each
-- has its own column and its own captured timestamp.
--
-- -----------------------------------------------------------------------------
-- COLUMNS ADDED
-- -----------------------------------------------------------------------------
--   company_name           text         NULLABLE  — optional free text, max 200 chars enforced at API layer
--   marketing_consent      boolean      NOT NULL  DEFAULT false
--   marketing_consent_at   timestamptz  NULLABLE  — set to NOW() at submit IFF marketing_consent=true; NULL otherwise
--
-- -----------------------------------------------------------------------------
-- ACCESS MODEL UNCHANGED (from migration 035)
-- -----------------------------------------------------------------------------
-- RLS stays ON with no policies. service_role (BYPASSRLS) writes via the
-- API route; anon / PUBLIC / authenticated retain zero grants. New
-- columns inherit the same access control automatically.
--
-- Verification block re-asserts the firewall invariant at the bottom.
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. Columns. IF NOT EXISTS guards make the migration safe to re-apply.
-- -----------------------------------------------------------------------------

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS company_name         text,
  ADD COLUMN IF NOT EXISTS marketing_consent    boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;


-- -----------------------------------------------------------------------------
-- 2. Verification
-- -----------------------------------------------------------------------------

-- (a) New columns present with the expected shape.
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'leads'
 ORDER BY ordinal_position;
-- Expected 9 rows. New ones:
--   company_name         | text                        | YES | NULL
--   marketing_consent    | boolean                     | NO  | false
--   marketing_consent_at | timestamp with time zone    | YES | NULL

-- (b) RLS still on.
SELECT rowsecurity
  FROM pg_tables
 WHERE schemaname = 'public' AND tablename = 'leads';
-- Expected: true

-- (c) anon / PUBLIC / authenticated still have ZERO grants.
SELECT grantee, COUNT(*)::int AS grants
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public'
   AND table_name = 'leads'
   AND grantee IN ('anon', 'PUBLIC', 'authenticated')
 GROUP BY grantee;
-- Expected: zero rows.

-- (d) Authoritative ACL — confirm no anon/authenticated/PUBLIC entries
--     leaked through (information_schema view can hide based on the
--     querying role; pg_class.relacl is the source of truth).
SELECT relacl::text AS acl
  FROM pg_class
 WHERE relname = 'leads'
   AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: '{postgres=..., service_role=...}' only.

COMMIT;
