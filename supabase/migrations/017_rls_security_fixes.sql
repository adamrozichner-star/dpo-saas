-- =============================================================================
-- 017_rls_security_fixes.sql
--
-- P0 SECURITY FIX (2026-05-20): close RLS gaps surfaced by the Day 2 audit.
--
-- Five distinct problems are addressed:
--
--   A. subscriptions table allowed INSERT/UPDATE from anon+authenticated
--      (billing-fraud risk — anyone could alter their own subscription tier).
--
--   B. Five tables had "ALL true" policies bound to the authenticated or public
--      role, effectively disabling RLS. Code review confirmed all reads/writes
--      go through service-role API routes only, so the policies can be dropped
--      with no replacement.
--
--   C. dpo_queue and security_incidents had the same "ALL true" anti-pattern,
--      but code review found user-session callers (src/app/chat/page.tsx and
--      src/app/dashboard/page.tsx). Those tables get a real org-scoped SELECT
--      policy in place of the over-permissive one.
--
--   D. Twelve "Service role full access" / "Service can manage X" policies
--      were bound to the public role with qual=true. service_role bypasses RLS
--      automatically, so these were pure backdoors granting anon+authenticated
--      full access. Dropping them does not affect API routes that use the
--      service-role key.
--
--   E. Four policies referenced users.id = auth.uid() instead of
--      users.auth_user_id = auth.uid(). users.id is the internal PK; the auth
--      UID matches auth_user_id. These policies could never match a row, so
--      they silently denied all reads (no current callers, so no production
--      breakage, but the bug would block future user-session use).
--
-- The whole migration runs inside a single transaction. If any statement
-- fails, Postgres rolls back the entire migration.
--
-- Apply manually after review (Supabase SQL Editor or psql):
--   psql "$SUPABASE_DB_URL" -f supabase/migrations/017_rls_security_fixes.sql
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- GROUP A — Critical: subscriptions billing-fraud risk
--
-- "Allow insert subscriptions" had with_check=true, "Allow update subscriptions"
-- had qual=true, both bound to the public role. Any caller could write any
-- subscription row, including changing tier/status on someone else's org.
-- Subscription rows are written by the Cardcom webhook only (service role),
-- so no replacement INSERT/UPDATE policy is needed. User-session SELECT is
-- already covered by the remaining "subscriptions_select_own" policy.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow update subscriptions" ON public.subscriptions;


-- -----------------------------------------------------------------------------
-- GROUP B — "ALL true" policies on service-role-only tables (drop, no replace)
--
-- Code grep confirmed every read/write of these five tables happens via the
-- service-role client. service_role bypasses RLS, so dropping the policies
-- leaves API routes working. Anon/authenticated callers (which shouldn't be
-- reaching these tables anyway) will be correctly denied.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "dpo_settings_all"            ON public.dpo_settings;
DROP POLICY IF EXISTS "dpo_time_log_all"            ON public.dpo_time_log;
DROP POLICY IF EXISTS "compliance_scores_all"       ON public.org_compliance_scores;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.incident_actions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.incident_notifications;


-- -----------------------------------------------------------------------------
-- GROUP C — dpo_queue + security_incidents: drop over-permissive, add org-scoped
--
-- src/app/chat/page.tsx:190 reads dpo_queue via the browser (anon-key) client
-- to show a pending-items count. src/app/dashboard/page.tsx:274 reads
-- security_incidents the same way. Both need a real SELECT policy.
-- Writes still happen via service-role API routes, so no INSERT/UPDATE policy
-- is added here.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "dpo_queue_all"               ON public.dpo_queue;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.security_incidents;

DROP POLICY IF EXISTS "dpo_queue_select_own_org" ON public.dpo_queue;
CREATE POLICY "dpo_queue_select_own_org" ON public.dpo_queue
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "security_incidents_select_own_org" ON public.security_incidents;
CREATE POLICY "security_incidents_select_own_org" ON public.security_incidents
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));


-- -----------------------------------------------------------------------------
-- GROUP D — Remove the 12 misnamed "Service role" backdoors
--
-- All twelve are bound to the public role with USING (true). They do NOT
-- restrict access to the service role — they grant full access to every
-- caller, including anon and authenticated. Since service_role already
-- bypasses RLS automatically, these policies have no legitimate purpose and
-- only widen the attack surface. Dropping them is safe.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role full access chat"        ON public.chat_messages;
DROP POLICY IF EXISTS "Service can manage summaries"         ON public.chat_conversation_summaries;
DROP POLICY IF EXISTS "Service role manages scenarios"       ON public.database_scenarios;
DROP POLICY IF EXISTS "Service role full access DPIAs"       ON public.dpia_assessments;
DROP POLICY IF EXISTS "Service role full access dpo_queue"   ON public.dpo_queue;
DROP POLICY IF EXISTS "Service role full access reports"     ON public.dpo_reports;
DROP POLICY IF EXISTS "service_role_threads"                 ON public.message_threads;
DROP POLICY IF EXISTS "service_role_messages"                ON public.messages;
DROP POLICY IF EXISTS "Service can manage memory"            ON public.org_memory;
DROP POLICY IF EXISTS "Service role full access qa_log"      ON public.qa_log;
DROP POLICY IF EXISTS "Service role can manage subscriptions"   ON public.subscriptions;
DROP POLICY IF EXISTS "service_role_manage_subscriptions"       ON public.subscriptions;


-- -----------------------------------------------------------------------------
-- GROUP E — Fix the four "users.id = auth.uid()" silent-deny policies
--
-- public.users.id is the internal PK uuid; the Supabase auth UID matches the
-- auth_user_id column. The old USING clauses could never match a row, so the
-- tables were silently empty to user-session callers. Replacement uses the
-- same org-membership pattern used by audit_logs / documents / etc.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own org reviews" ON public.compliance_reviews;
CREATE POLICY "Users can view own org reviews" ON public.compliance_reviews
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own org tokens" ON public.consultation_tokens;
CREATE POLICY "Users can view own org tokens" ON public.consultation_tokens
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own org token transactions" ON public.token_transactions;
CREATE POLICY "Users can view own org token transactions" ON public.token_transactions
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own org work plans" ON public.work_plans;
CREATE POLICY "Users can view own org work plans" ON public.work_plans
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));


-- -----------------------------------------------------------------------------
-- Verification — post-migration policy counts on every affected table.
-- Expected (read top-down):
--   compliance_reviews     1   (Group E replacement)
--   consultation_tokens    1   (Group E replacement)
--   dpo_queue              1   (Group C replacement; old + service-role dup dropped)
--   security_incidents     1   (Group C replacement)
--   subscriptions          4   (was 7; dropped 1A + 2D backdoors)
--   token_transactions     1   (Group E replacement)
--   work_plans             1   (Group E replacement)
-- -----------------------------------------------------------------------------
SELECT 'Policies after migration' AS report,
       tablename,
       COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('subscriptions', 'dpo_queue', 'security_incidents',
                    'compliance_reviews', 'consultation_tokens',
                    'token_transactions', 'work_plans')
GROUP BY tablename
ORDER BY tablename;


COMMIT;

-- To dry-run: change COMMIT to ROLLBACK at the bottom and run; nothing will be persisted.
