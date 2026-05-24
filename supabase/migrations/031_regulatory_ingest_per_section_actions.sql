-- =============================================================================
-- 031_regulatory_ingest_per_section_actions.sql
--
-- Extends regulatory_ingest_persist (last touched in migration 028's
-- pre-RLS-disable era) to handle per-section actions driven by the
-- semantic-diff layer added in migration 030.
--
-- -----------------------------------------------------------------------------
-- WHY THIS CHANGES
-- -----------------------------------------------------------------------------
-- Before: each upload = "1 new document + N new sections, atomically".
-- After:  each upload = "1 new document + per-section action mix":
--
--   - action='insert'  → new regulatory_sections row linked to the new doc
--   - action='skip'    → drop the section (duplicate or curator-skipped conflict)
--   - action='replace' → UPDATE an EXISTING regulatory_sections row's
--                        content/embedding/heading in place. The new
--                        document is NOT linked to that section; the
--                        section stays attached to its original document.
--
-- 'keep_both' in the UI maps to 'insert' here (the new section is added,
-- and the existing one is untouched). So the on-the-wire action vocabulary
-- has only 3 values; UI semantics get translated client-side.
--
-- -----------------------------------------------------------------------------
-- OPTION A: ALWAYS CREATE THE NEW DOCUMENT ROW
-- -----------------------------------------------------------------------------
-- Even if every section resolves to skip/replace, we still create the
-- regulatory_documents row. Two reasons:
--   1. Provenance: "<curator> uploaded <file> on <date>" stays visible
--      in the stats / list UI even when the content was redundant.
--   2. Simpler client contract: caller always gets back a document_id.
--      A "no document row created" early return would force every UI
--      to branch.
--
-- The cost is the occasional zero-section document row. Acceptable.
--
-- -----------------------------------------------------------------------------
-- EMBEDDINGS
-- -----------------------------------------------------------------------------
-- For action='insert', the section JSON may carry an `embedding_text`
-- field — pgvector text format `[0.1,0.2,...]`. The function casts it
-- to vector(1024) before INSERT. If absent, embedding stays NULL and
-- the section is invisible to find_similar_section until backfill.
--
-- For action='replace', `embedding_text` overwrites the target row's
-- embedding (the new content has a new vector, the old one is stale).
--
-- -----------------------------------------------------------------------------
-- BACKWARD COMPATIBILITY
-- -----------------------------------------------------------------------------
-- Old callers passing sections WITHOUT an `action` field will be
-- treated as 'insert' — preserves the pre-031 contract. (Today's only
-- caller is src/lib/regulatory/persister.ts, which is updated in the
-- same PR; this is belt-and-suspenders.)
--
-- -----------------------------------------------------------------------------
-- FIREWALL UNCHANGED
-- -----------------------------------------------------------------------------
-- Same SECURITY DEFINER + owner=regulatory_ingest_worker + search_path
-- as 024/025/026. Worker still has GRANT INSERT/UPDATE on
-- regulatory_sections (from 023), which covers the new 'replace' branch.
-- Worker still has ZERO grants on hub_* tables — verified below.
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- Replace the function. Signature is identical to migration 024/028 —
-- the new behavior lives inside p_sections (each element now optionally
-- carries action / target_section_id / embedding_text).
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
  v_action           text;
  v_target_id        uuid;
  v_embedding_text   text;
  v_inserted_count   int := 0;
  v_replaced_count   int := 0;
  v_skipped_count    int := 0;
BEGIN
  -- 1. Idempotency lookup. With PDF uploads using fresh pdf-upload://uuid
  --    URLs per upload, this branch effectively never fires in the new
  --    flow — section-level diff has taken over the dedup role. We
  --    keep the URL-based check for scraper paths that may yet land
  --    (e.g., gov.il if Cloudflare opens up) where URL is stable.
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

  -- 2. Always create the new document row (Option A — see header).
  INSERT INTO regulatory_documents (
    url, title, source_org, version, content_hash, raw_html, metadata, fetched_at
  ) VALUES (
    p_url, p_title, p_source_org, v_new_version, p_content_hash,
    p_raw_html, COALESCE(p_metadata, '{}'::jsonb), now()
  )
  RETURNING id INTO v_new_id;

  -- 3. Supersede the previous current version, if any (URL-stable path only).
  IF v_existing_id IS NOT NULL THEN
    UPDATE regulatory_documents
       SET superseded_by = v_new_id
     WHERE id = v_existing_id;
  END IF;

  -- 4. Per-section dispatch.
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

    ELSE -- 'insert' (default for missing / unknown action — be lenient)
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
    'sections_count', v_inserted_count, -- sections newly attached to this doc (excl. replace/skip)
    'inserted',       v_inserted_count,
    'replaced',       v_replaced_count,
    'skipped',        v_skipped_count
  );
END;
$$;


-- -----------------------------------------------------------------------------
-- Defensive re-assertion of contract (no-op on clean apply, correct on
-- a recovered/replayed state where ownership might have drifted).
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
-- Verification
-- -----------------------------------------------------------------------------

-- (a) Function exists, owner=worker, SECURITY DEFINER.
SELECT proname, pg_get_userbyid(proowner) AS owner, prosecdef
  FROM pg_proc
 WHERE proname = 'regulatory_ingest_persist'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: owner='regulatory_ingest_worker', prosecdef=true

-- (b) Body references the new action vocabulary.
SELECT
  position('action=replace' IN prosrc) > 0 AS has_replace_branch,
  position('embedding_text' IN prosrc) > 0 AS has_embedding_cast
FROM pg_proc
WHERE proname = 'regulatory_ingest_persist'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: both true

-- (c) FIREWALL SANITY: worker still has zero grants on any hub_* table.
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'regulatory_ingest_worker'
   AND table_schema = 'public'
   AND table_name LIKE 'hub_%';
-- Expected: 0

COMMIT;
