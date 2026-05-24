-- =============================================================================
-- 026_regulatory_ingest_service_role_rls.sql
--
-- Replaces migration 025's failed SET LOCAL ROLE approach.
--
-- Symptom (post-025): curator approve fails with
--   "cannot set parameter 'role' within security-definer function"
-- Postgres explicitly forbids changing role inside a SECURITY DEFINER
-- function (security hardening — owner-defined functions can't escalate
-- via SET ROLE). The 025 strategy is structurally unworkable.
--
-- New strategy: keep SECURITY DEFINER + worker ownership (this is what
-- enforces the firewall — see below), but realign the RLS policies on
-- the regulatory_* tables to match the actual current_user during the
-- write. Once 025's SET ROLE is removed, the function executes with
-- current_user resolved by the SECURITY DEFINER + supabase.rpc call
-- chain, and the existing worker-scoped policies don't match — hence
-- the original "row-level security policy" error 025 was meant to fix.
--
-- The simplest stable rule that always matches is: scope INSERT/UPDATE
-- policies to service_role (the role used by supabase.rpc). The
-- firewall is not weakened, because the firewall lives at the
-- table-GRANT layer, not the RLS layer — see the section below.
--
-- -----------------------------------------------------------------------------
-- WHY THE FIREWALL STILL HOLDS
-- -----------------------------------------------------------------------------
-- The firewall promise is: "the regulatory ingest path cannot write to
-- hub_* tables." This is enforced by **table-level GRANTs**, not by RLS:
--
--   1. regulatory_ingest_worker (the function owner) has GRANTs only on
--      regulatory_documents and regulatory_sections. It has ZERO grants
--      on any hub_* table.
--   2. SECURITY DEFINER means every statement inside the function body
--      executes with the OWNER's privileges (worker). So any INSERT into
--      hub_* added to the function body would fail with
--      "permission denied for table hub_*" at the privilege-check layer,
--      BEFORE RLS even evaluates.
--   3. RLS is the *outer* defense — it only governs WHO may call the
--      sanctioned write path. The privilege firewall (1+2) governs WHAT
--      the path can write.
--
-- Result: scoping RLS to service_role widens "who may call the function"
-- but does NOT widen "what the function may do." The firewall property is
-- preserved.
--
-- Why we keep SECURITY DEFINER (vs. removing it entirely):
--   - Without SECURITY DEFINER the function runs as the CALLER
--     (service_role), which DOES have hub_* grants. The "trip wire"
--     property — code review notices any future `INSERT INTO hub_*`
--     because it would fail at the privilege layer — disappears.
--   - SECURITY DEFINER + non-hub-granted owner is the cheapest,
--     code-review-visible firewall we have. Worth preserving.
--
-- The verification block at the bottom asserts both halves of the
-- invariant: service_role can drive writes via RLS, AND worker still
-- has zero hub_* grants.
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. Drop the worker-scoped INSERT/UPDATE policies from migration 023.
--
-- They never matched the actual current_user during the write path.
-- We retain the SELECT policies (which target `authenticated`) — those
-- govern read access from the curator UI and are unrelated to this bug.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "regulatory_documents_insert_ingest_worker" ON public.regulatory_documents;
DROP POLICY IF EXISTS "regulatory_documents_update_ingest_worker" ON public.regulatory_documents;
DROP POLICY IF EXISTS "regulatory_sections_insert_ingest_worker"  ON public.regulatory_sections;
DROP POLICY IF EXISTS "regulatory_sections_update_ingest_worker"  ON public.regulatory_sections;


-- -----------------------------------------------------------------------------
-- 2. Replace with service_role-scoped INSERT/UPDATE policies.
--
-- service_role is the role used by supabase.rpc from server-side code
-- (lib/regulatory/persister.ts). With SECURITY DEFINER kept, RLS
-- evaluates against the resolved current_user from that call chain;
-- empirically the existing failure proves it does NOT resolve to the
-- function owner (worker), and service_role is the matching grantee.
-- -----------------------------------------------------------------------------

CREATE POLICY "regulatory_documents_insert_service_role"
  ON public.regulatory_documents
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "regulatory_documents_update_service_role"
  ON public.regulatory_documents
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "regulatory_sections_insert_service_role"
  ON public.regulatory_sections
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "regulatory_sections_update_service_role"
  ON public.regulatory_sections
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 3. Replace the function body to remove migration 025's SET LOCAL ROLE.
--
-- Body matches migration 024 exactly. SECURITY DEFINER + worker
-- ownership are preserved (table-GRANT firewall).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.regulatory_ingest_persist(
  p_url           text,
  p_title         text,
  p_source_org    regulatory_source_org,
  p_content_hash  text,
  p_raw_html      text,
  p_metadata      jsonb,
  p_sections      jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_id      uuid;
  v_existing_hash    text;
  v_existing_version int;
  v_new_id           uuid;
  v_new_version      int;
  v_section          jsonb;
  v_section_count    int := 0;
BEGIN
  -- 1. Idempotency lookup: latest non-superseded version for this URL.
  SELECT id, content_hash, version
    INTO v_existing_id, v_existing_hash, v_existing_version
    FROM regulatory_documents
   WHERE url = p_url AND superseded_by IS NULL
   ORDER BY version DESC
   LIMIT 1;

  IF v_existing_id IS NOT NULL AND v_existing_hash = p_content_hash THEN
    RETURN jsonb_build_object(
      'status',         'unchanged',
      'document_id',    v_existing_id,
      'version',        v_existing_version,
      'sections_count', (SELECT COUNT(*)::int FROM regulatory_sections WHERE document_id = v_existing_id)
    );
  END IF;

  v_new_version := COALESCE(v_existing_version, 0) + 1;

  -- 2. Insert the new document row.
  INSERT INTO regulatory_documents (
    url, title, source_org, version, content_hash, raw_html, metadata, fetched_at
  ) VALUES (
    p_url, p_title, p_source_org, v_new_version, p_content_hash,
    p_raw_html, COALESCE(p_metadata, '{}'::jsonb), now()
  )
  RETURNING id INTO v_new_id;

  -- 3. Supersede the previous current version, if any.
  IF v_existing_id IS NOT NULL THEN
    UPDATE regulatory_documents
       SET superseded_by = v_new_id
     WHERE id = v_existing_id;
  END IF;

  -- 4. Insert all sections fresh.
  FOR v_section IN SELECT * FROM jsonb_array_elements(COALESCE(p_sections, '[]'::jsonb))
  LOOP
    INSERT INTO regulatory_sections (
      document_id, ordinal, heading, anchor, content_text, content_hash
    ) VALUES (
      v_new_id,
      (v_section ->> 'ordinal')::int,
      v_section ->> 'heading',
      v_section ->> 'anchor',
      v_section ->> 'content_text',
      v_section ->> 'content_hash'
    );
    v_section_count := v_section_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'status',         CASE WHEN v_existing_id IS NULL THEN 'created' ELSE 'updated' END,
    'document_id',    v_new_id,
    'version',        v_new_version,
    'sections_count', v_section_count
  );
END;
$$;

-- Defensive re-assertion of contract (CREATE OR REPLACE preserves
-- existing ownership, so this is a no-op on a clean apply but
-- correct on a recovered/replayed state).
ALTER FUNCTION public.regulatory_ingest_persist(
  text, text, regulatory_source_org, text, text, jsonb, jsonb
) OWNER TO regulatory_ingest_worker;

REVOKE EXECUTE ON FUNCTION public.regulatory_ingest_persist(
  text, text, regulatory_source_org, text, text, jsonb, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.regulatory_ingest_persist(
  text, text, regulatory_source_org, text, text, jsonb, jsonb
) TO service_role;


-- -----------------------------------------------------------------------------
-- 4. Revoke worker membership from service_role (cleanup from 025).
--
-- 025 granted this so SET LOCAL ROLE inside the function could succeed.
-- We're no longer using SET ROLE, so the membership is unnecessary.
-- Removing it shrinks the attack surface: service_role can no longer
-- masquerade as the worker outside the function, even hypothetically.
-- -----------------------------------------------------------------------------

REVOKE regulatory_ingest_worker FROM service_role;


-- -----------------------------------------------------------------------------
-- 5. Verification
-- -----------------------------------------------------------------------------

-- (a) Function exists, owned by worker, SECURITY DEFINER on,
--     body does NOT contain 'SET LOCAL ROLE'.
SELECT
  proname AS function_name,
  pg_get_userbyid(proowner) AS owner,
  prosecdef AS is_security_definer,
  position('SET LOCAL ROLE' IN prosrc) = 0 AS set_role_removed
FROM pg_proc
WHERE proname = 'regulatory_ingest_persist'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: 1 row — owner='regulatory_ingest_worker',
--           is_security_definer=true, set_role_removed=true

-- (b) RLS policies — should see 2 service_role write policies per table,
--     and ZERO surviving ingest_worker write policies.
SELECT tablename, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('regulatory_documents', 'regulatory_sections')
 ORDER BY tablename, policyname;
-- Expected: SELECT/authenticated + INSERT/service_role + UPDATE/service_role
--           on each table; NO policies mentioning regulatory_ingest_worker.

-- (c) FIREWALL SANITY: worker has zero grants on any hub_* table.
--     This is the structural invariant the firewall rests on; if it
--     is ever non-zero, the firewall is broken regardless of RLS.
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'regulatory_ingest_worker'
   AND table_schema = 'public'
   AND table_name LIKE 'hub_%';
-- Expected: 0

-- (d) Worker is no longer a member-grantee for service_role
--     (025 cleanup verified).
SELECT EXISTS (
  SELECT 1
    FROM pg_auth_members am
    JOIN pg_roles r1 ON r1.oid = am.roleid
    JOIN pg_roles r2 ON r2.oid = am.member
   WHERE r1.rolname = 'regulatory_ingest_worker'
     AND r2.rolname = 'service_role'
) AS service_role_still_has_worker_membership;
-- Expected: false

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECTs
-- still print but nothing persists. After a successful real run, re-test
-- the PDF approve flow end-to-end — it should now persist.
