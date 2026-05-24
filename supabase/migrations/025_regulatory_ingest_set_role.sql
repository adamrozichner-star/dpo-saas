-- =============================================================================
-- 025_regulatory_ingest_set_role.sql
--
-- Fixes an RLS-evaluation bug in regulatory_ingest_persist (migration 024).
--
-- Symptom (pre-fix): curator PDF upload + approve flow fails with
--   "new row violates row-level security policy for table regulatory_documents"
--
-- Root cause: SECURITY DEFINER changes the function's effective PRIVILEGES
-- (table grants etc.) to the owner's, but RLS policies are evaluated
-- against current_role, which by default remains the caller's role
-- (service_role). The INSERT policies from migration 023 are scoped
-- "TO regulatory_ingest_worker", so they don't match service_role and
-- the writes are rejected.
--
-- Fix: SET LOCAL ROLE regulatory_ingest_worker at the top of the function
-- body. RLS then evaluates against the worker role and the worker-scoped
-- INSERT/UPDATE policies match. SET LOCAL is scoped to the transaction;
-- when the function transaction commits, the role change ends.
--
-- Prerequisite: for SET LOCAL ROLE to succeed, the SESSION's authenticated
-- role (service_role here) must have membership in the target role. We
-- grant that membership below.
--
-- Firewall property preserved:
--   - service_role gaining the ability to SET ROLE to worker is a
--     DOWNGRADE path, not an upgrade. service_role retains its own
--     hub_* grants when NOT in worker mode.
--   - regulatory_ingest_worker still has NO grants on hub_* tables.
--   - Inside the function body (SET LOCAL ROLE), worker grants apply:
--     regulatory_* writes succeed, hub_* writes fail with permission
--     denied — exactly the firewall behavior.
--   - The function remains the only sanctioned write path; the
--     persister.ts comment block forbids reaching around it.
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. Grant service_role membership in regulatory_ingest_worker
--
-- This is the technical enablement for SET LOCAL ROLE inside the function
-- body. It does NOT grant service_role any direct write access on
-- regulatory_* tables (those grants are on the worker role) and does NOT
-- weaken the firewall — see header.
-- -----------------------------------------------------------------------------

GRANT regulatory_ingest_worker TO service_role;


-- -----------------------------------------------------------------------------
-- 2. Replace function body to switch role before any writes
--
-- Body is identical to migration 024 except for the leading
--   SET LOCAL ROLE regulatory_ingest_worker;
-- statement.
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
  -- Switch the effective role for RLS evaluation. Scoped to this
  -- transaction; reverts on COMMIT/ROLLBACK.
  SET LOCAL ROLE regulatory_ingest_worker;

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


-- -----------------------------------------------------------------------------
-- 3. Defensive re-assertion of ownership + grants
--
-- CREATE OR REPLACE preserves the existing function's ownership, but we
-- restate the contract here so that if someone re-runs this migration on
-- a database where the function was dropped + recreated by a different
-- role, the final state is correct.
-- -----------------------------------------------------------------------------

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
-- 4. Verification
-- -----------------------------------------------------------------------------

-- Function exists, owner is worker, SECURITY DEFINER on.
SELECT
  proname AS function_name,
  pg_get_userbyid(proowner) AS owner,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'regulatory_ingest_persist'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: 1 row, owner='regulatory_ingest_worker', is_security_definer=true

-- service_role has membership in regulatory_ingest_worker.
SELECT EXISTS (
  SELECT 1
    FROM pg_auth_members am
    JOIN pg_roles r1 ON r1.oid = am.roleid
    JOIN pg_roles r2 ON r2.oid = am.member
   WHERE r1.rolname = 'regulatory_ingest_worker'
     AND r2.rolname = 'service_role'
) AS service_role_has_worker_membership;
-- Expected: true

-- Firewall sanity: worker still has NO grants on any hub_* table.
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'regulatory_ingest_worker'
   AND table_schema = 'public'
   AND table_name LIKE 'hub_%';
-- Expected: 0 (worker must NOT have any hub_* grants — that's the firewall)

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECTs
-- still print but nothing persists.
