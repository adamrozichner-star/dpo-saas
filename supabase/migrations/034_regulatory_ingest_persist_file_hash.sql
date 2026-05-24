-- =============================================================================
-- 034_regulatory_ingest_persist_file_hash.sql
--
-- Extends regulatory_ingest_persist (last touched in migration 031) to
-- accept and store p_file_content_hash on the new document row. This
-- closes the loop on Bug 2's byte-level dedup: the upload route
-- computes the SHA-256 of the PDF bytes, the short-circuit lookup
-- (find_document_by_file_hash, migration 033) checks for an existing
-- match, and on a miss the new hash gets persisted here for the next
-- re-upload to find.
--
-- -----------------------------------------------------------------------------
-- WHY DROP + CREATE (not CREATE OR REPLACE)
-- -----------------------------------------------------------------------------
-- The function signature changes (adding p_file_content_hash). Postgres
-- CREATE OR REPLACE requires the new declaration to match the old one
-- exactly — a different parameter list creates an OVERLOAD instead of
-- replacing. Overloads here would be a footgun: PostgREST + supabase-js
-- would resolve calls to either version unpredictably depending on
-- which named args the caller sends.
--
-- DROP + CREATE inside this transaction is atomic. Other transactions
-- see either the old function or the new one, never a missing one.
--
-- -----------------------------------------------------------------------------
-- BACKWARD COMPATIBILITY
-- -----------------------------------------------------------------------------
-- p_file_content_hash DEFAULT NULL. Any in-flight caller that still
-- sends the old 7-arg payload (post-031 schema) will succeed; the new
-- hash column just stays NULL on that row. Useful for the brief window
-- between migration 034 applying and the Vercel deploy with the
-- updated persister.ts going live.
--
-- -----------------------------------------------------------------------------
-- FIREWALL UNCHANGED
-- -----------------------------------------------------------------------------
-- Same SECURITY DEFINER, same owner=regulatory_ingest_worker, same
-- EXECUTE-to-service_role-only. Worker still has zero hub_* grants —
-- verified at the bottom.
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. Drop the old 7-arg signature.
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.regulatory_ingest_persist(
  text, text, regulatory_source_org, text, text, jsonb, jsonb
);


-- -----------------------------------------------------------------------------
-- 2. Create the 8-arg signature (adds p_file_content_hash at the end).
--    Body identical to migration 031 except for the file_content_hash
--    column on the INSERT.
-- -----------------------------------------------------------------------------

CREATE FUNCTION public.regulatory_ingest_persist(
  p_url               text,
  p_title             text,
  p_source_org        regulatory_source_org,
  p_content_hash      text,
  p_raw_html          text,
  p_metadata          jsonb,
  p_sections          jsonb,
  p_file_content_hash text DEFAULT NULL
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
  v_action           text;
  v_target_id        uuid;
  v_embedding_text   text;
  v_inserted_count   int := 0;
  v_replaced_count   int := 0;
  v_skipped_count    int := 0;
BEGIN
  -- 1. URL-based idempotency lookup (legacy path; never fires for PDF
  --    uploads since each gets a fresh pdf-upload://uuid URL, but kept
  --    for the scraper path).
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
      'sections_count', (SELECT COUNT(*)::int FROM regulatory_sections WHERE document_id = v_existing_id),
      'inserted',       0,
      'replaced',       0,
      'skipped',        0
    );
  END IF;

  v_new_version := COALESCE(v_existing_version, 0) + 1;

  -- 2. Create the new document row, stashing the file_content_hash.
  INSERT INTO regulatory_documents (
    url, title, source_org, version, content_hash, raw_html,
    metadata, fetched_at, file_content_hash
  ) VALUES (
    p_url, p_title, p_source_org, v_new_version, p_content_hash,
    p_raw_html, COALESCE(p_metadata, '{}'::jsonb), now(), p_file_content_hash
  )
  RETURNING id INTO v_new_id;

  -- 3. Supersede the previous URL-version, if any.
  IF v_existing_id IS NOT NULL THEN
    UPDATE regulatory_documents
       SET superseded_by = v_new_id
     WHERE id = v_existing_id;
  END IF;

  -- 4. Per-section dispatch (unchanged from 031).
  FOR v_section IN SELECT * FROM jsonb_array_elements(COALESCE(p_sections, '[]'::jsonb))
  LOOP
    v_action         := COALESCE(v_section ->> 'action', 'insert');
    v_target_id      := NULLIF(v_section ->> 'target_section_id', '')::uuid;
    v_embedding_text := NULLIF(v_section ->> 'embedding_text', '');

    IF v_action = 'skip' THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;

    ELSIF v_action = 'replace' THEN
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'action=replace requires target_section_id (section ordinal %)',
          v_section ->> 'ordinal';
      END IF;

      UPDATE regulatory_sections
         SET heading      = v_section ->> 'heading',
             anchor       = v_section ->> 'anchor',
             content_text = v_section ->> 'content_text',
             content_hash = v_section ->> 'content_hash',
             embedding    = CASE
                              WHEN v_embedding_text IS NOT NULL
                                THEN v_embedding_text::vector(1024)
                              ELSE embedding
                            END
       WHERE id = v_target_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'action=replace target_section_id % not found', v_target_id;
      END IF;
      v_replaced_count := v_replaced_count + 1;

    ELSE -- 'insert' (default for missing / unknown action)
      INSERT INTO regulatory_sections (
        document_id, ordinal, heading, anchor, content_text, content_hash, embedding
      ) VALUES (
        v_new_id,
        (v_section ->> 'ordinal')::int,
        v_section ->> 'heading',
        v_section ->> 'anchor',
        v_section ->> 'content_text',
        v_section ->> 'content_hash',
        CASE
          WHEN v_embedding_text IS NOT NULL THEN v_embedding_text::vector(1024)
          ELSE NULL
        END
      );
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status',         CASE WHEN v_existing_id IS NULL THEN 'created' ELSE 'updated' END,
    'document_id',    v_new_id,
    'version',        v_new_version,
    'sections_count', v_inserted_count,
    'inserted',       v_inserted_count,
    'replaced',       v_replaced_count,
    'skipped',        v_skipped_count
  );
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. Ownership + grants on the new signature.
-- -----------------------------------------------------------------------------

ALTER FUNCTION public.regulatory_ingest_persist(
  text, text, regulatory_source_org, text, text, jsonb, jsonb, text
) OWNER TO regulatory_ingest_worker;

REVOKE EXECUTE ON FUNCTION public.regulatory_ingest_persist(
  text, text, regulatory_source_org, text, text, jsonb, jsonb, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.regulatory_ingest_persist(
  text, text, regulatory_source_org, text, text, jsonb, jsonb, text
) TO service_role;


-- -----------------------------------------------------------------------------
-- 4. Verification
-- -----------------------------------------------------------------------------

-- (a) Old 7-arg version no longer exists.
SELECT COUNT(*)::int AS old_7arg_versions
  FROM pg_proc
 WHERE proname='regulatory_ingest_persist'
   AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
   AND pronargs = 7;
-- Expected: 0

-- (b) New 8-arg version exists, owner=worker, SECURITY DEFINER on.
SELECT pronargs,
       pg_get_userbyid(proowner) AS owner,
       prosecdef,
       position('p_file_content_hash' IN pg_get_function_arguments(oid)) > 0 AS has_new_param
  FROM pg_proc
 WHERE proname='regulatory_ingest_persist'
   AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public');
-- Expected: 1 row, pronargs=8, owner='regulatory_ingest_worker',
--           prosecdef=true, has_new_param=true

-- (c) FIREWALL SANITY.
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee='regulatory_ingest_worker'
   AND table_schema='public'
   AND table_name LIKE 'hub_%';
-- Expected: 0

COMMIT;
