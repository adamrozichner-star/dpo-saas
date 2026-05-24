-- =============================================================================
-- 033_regulatory_file_content_hash.sql
--
-- Adds deterministic byte-level dedup for PDF uploads.
--
-- Background: Haiku's extraction is non-deterministic. Re-uploading
-- the same PDF produced slightly different section boundaries each
-- time, which changed each section's content_hash, which made
-- semantic-diff flag them as 'conflict' (similar topic, different
-- content) instead of 'duplicate'. Curator saw a 3/5/3 split where
-- they expected 11/0/0 — a UX disaster on re-uploads.
--
-- Fix: SHA-256 the PDF bytes BEFORE extraction. If a non-superseded
-- row with the same file_content_hash already exists, short-circuit
-- the entire pipeline. No Haiku call, no embeddings, no diff —
-- instant "already exists" response.
--
-- This migration adds the column + partial unique index. The
-- find_document_by_file_hash RPC that drives the lookup also lives
-- here (instead of in 032 alongside the other read RPCs) because
-- Postgres validates SQL function bodies at CREATE time and an RPC
-- referencing this column couldn't be created in 032.
--
-- Migration 034 updates regulatory_ingest_persist to accept the hash
-- and store it on insert.
--
-- -----------------------------------------------------------------------------
-- WHY A PARTIAL UNIQUE INDEX
-- -----------------------------------------------------------------------------
-- WHERE file_content_hash IS NOT NULL AND superseded_by IS NULL.
--
--   - NOT NULL: the 5 pre-existing rows have NULL hash (we don't have
--     their original PDF bytes cached), so they must coexist.
--   - superseded_by IS NULL: only the currently-active version of a
--     document is constrained. If a document is later edited and
--     superseded, a future fresh upload of the original bytes can
--     proceed.
--   - UNIQUE: enforces "at most one active document per file hash"
--     at the DB layer. Without this, two concurrent uploads of the
--     same bytes could both pass the lookup check and create two
--     rows. With it, the second INSERT errors with a unique violation
--     and the upload route can fall back to the existing row.
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. Column. Nullable — pre-existing rows stay NULL.
-- -----------------------------------------------------------------------------

ALTER TABLE public.regulatory_documents
  ADD COLUMN IF NOT EXISTS file_content_hash text;


-- -----------------------------------------------------------------------------
-- 2. Partial unique index.
-- -----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.regulatory_documents_file_content_hash_active_uniq;

CREATE UNIQUE INDEX regulatory_documents_file_content_hash_active_uniq
  ON public.regulatory_documents (file_content_hash)
  WHERE file_content_hash IS NOT NULL
    AND superseded_by IS NULL;


-- -----------------------------------------------------------------------------
-- 3. find_document_by_file_hash RPC (feeds the upload short-circuit).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.find_document_by_file_hash(
  p_file_hash text
)
RETURNS TABLE (
  id         uuid,
  title      text,
  fetched_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT d.id, d.title, d.fetched_at
    FROM regulatory_documents d
   WHERE d.file_content_hash = p_file_hash
     AND d.superseded_by IS NULL
   LIMIT 1;
$$;

ALTER FUNCTION public.find_document_by_file_hash(text)
  OWNER TO regulatory_ingest_worker;
REVOKE EXECUTE ON FUNCTION public.find_document_by_file_hash(text)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.find_document_by_file_hash(text)
  TO service_role;


-- -----------------------------------------------------------------------------
-- 4. Verification
-- -----------------------------------------------------------------------------

-- (a) Column exists, nullable text.
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema='public'
   AND table_name='regulatory_documents'
   AND column_name='file_content_hash';
-- Expected: 1 row, data_type='text', is_nullable='YES'

-- (b) Partial unique index exists with the expected filter.
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE schemaname='public'
   AND indexname='regulatory_documents_file_content_hash_active_uniq';
-- Expected: 1 row, indexdef contains 'UNIQUE INDEX ... WHERE
--           (file_content_hash IS NOT NULL AND superseded_by IS NULL)'

-- (c) RPC exists, owner=worker, SECURITY DEFINER on.
SELECT proname, pg_get_userbyid(proowner) AS owner, prosecdef
  FROM pg_proc
 WHERE proname='find_document_by_file_hash'
   AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public');
-- Expected: 1 row, owner='regulatory_ingest_worker', prosecdef=true

-- (d) Existing 5 rows still readable (the new column should be NULL on each).
SELECT COUNT(*)::int AS rows_with_null_file_hash
  FROM regulatory_documents
 WHERE file_content_hash IS NULL
   AND superseded_by IS NULL;
-- Expected (today): 5 (the pre-existing rows; future uploads populate the column)

-- (e) FIREWALL SANITY.
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee='regulatory_ingest_worker'
   AND table_schema='public'
   AND table_name LIKE 'hub_%';
-- Expected: 0

COMMIT;
