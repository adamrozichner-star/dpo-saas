-- =============================================================================
-- 024_regulatory_ingest_function.sql
--
-- Persistence-side firewall for the regulatory ingest worker.
--
-- Architecture: a SECURITY DEFINER function OWNED BY regulatory_ingest_worker.
-- Service_role calls the function via supabase.rpc(); inside the function
-- body the effective role becomes regulatory_ingest_worker (function owner).
-- That role's GRANTs (from 023) are SELECT/INSERT/UPDATE on regulatory_*
-- tables only — no grants on hub_* tables. Any hub write attempt inside
-- this function fails with "permission denied". The firewall is enforced
-- at the function-call boundary, not by application code discipline.
--
-- Why this instead of separate Postgres connection:
--   - Supabase session pooler routes by username pattern; custom non-postgres
--     roles aren't first-class through the pooler.
--   - Direct connection (db.<project>.supabase.co:5432) is IPv6-only on
--     modern Supabase projects; not reliably reachable from Vercel functions.
--   - Function-with-SECURITY-DEFINER ships through the same Supabase JS
--     client every other backend module already uses.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- regulatory_ingest_persist
--
-- Single-call persistence: idempotency, version bumping, document insert,
-- supersession update, sections insert. All inside one transaction.
--
-- Inputs:
--   p_url           — source URL (unique key for "logical document")
--   p_title         — document title
--   p_source_org    — regulatory_source_org enum
--   p_content_hash  — SHA256 of full normalized plain text
--   p_raw_html      — original HTML (preserved for re-parse)
--   p_metadata      — arbitrary JSON metadata (publication date, etc.)
--   p_sections      — JSON array of {ordinal, heading, anchor, content_text, content_hash}
--
-- Returns JSONB:
--   { status: 'created' | 'updated' | 'unchanged',
--     document_id: uuid,
--     version: int,
--     sections_count: int }
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
SET search_path = public
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

  -- 4. Insert all sections fresh. (No section-level diff for v1; sections
  --    are immutable per document version.)
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

-- Transfer ownership to the worker role. Function body executes with this
-- role's privileges due to SECURITY DEFINER. The worker has no grants on
-- hub_* tables, so any future modification of this function that tries to
-- touch a hub table will fail at execution time.
ALTER FUNCTION public.regulatory_ingest_persist OWNER TO regulatory_ingest_worker;

-- Allow service_role (backend code) to invoke it.
GRANT EXECUTE ON FUNCTION public.regulatory_ingest_persist(
  text, text, regulatory_source_org, text, text, jsonb, jsonb
) TO service_role;

-- Revoke from PUBLIC so anon/authenticated can't invoke (defense in depth).
REVOKE EXECUTE ON FUNCTION public.regulatory_ingest_persist(
  text, text, regulatory_source_org, text, text, jsonb, jsonb
) FROM PUBLIC;


-- -----------------------------------------------------------------------------
-- Verification — call must exist with the expected owner.
-- -----------------------------------------------------------------------------

SELECT
  proname AS function_name,
  pg_get_userbyid(proowner) AS owner,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'regulatory_ingest_persist'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: 1 row, owner='regulatory_ingest_worker', is_security_definer=true

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECT
-- still prints but nothing persists.
