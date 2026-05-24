-- =============================================================================
-- 030_pgvector_section_embeddings.sql
--
-- Adds pgvector + a 1024-dim embedding column to regulatory_sections,
-- a HNSW cosine-similarity index, and a SECURITY DEFINER helper RPC
-- (find_similar_section) used by the semantic-diff layer when curators
-- upload a new document.
--
-- -----------------------------------------------------------------------------
-- EMBEDDING MODEL CHOICE: Voyage AI voyage-3 (1024 dims, multilingual)
-- -----------------------------------------------------------------------------
-- Picked over OpenAI text-embedding-3-small (1536 dims) because:
--   - Hebrew is a first-class supported language on Voyage's multilingual
--     models; text-embedding-3-small is English-biased and tends to
--     under-cluster non-English content.
--   - 1024 dims is sufficient for the small-corpus, single-domain use
--     case (regulatory text) and keeps index/storage costs lower.
--   - If we ever change models, only this column dimension + the
--     similarity thresholds in semantic-diff.ts need updating.
--
-- -----------------------------------------------------------------------------
-- INDEX CHOICE: HNSW with vector_cosine_ops
-- -----------------------------------------------------------------------------
-- HNSW (rather than IVFFLAT) because:
--   - Better recall at low row counts (we have 6 sections today; IVFFLAT
--     requires training data and quality degrades on tiny tables).
--   - No "list count" tuning parameter that needs revisiting as the
--     corpus grows.
--   - Cosine ops matches the similarity metric the diff layer uses.
--
-- -----------------------------------------------------------------------------
-- FIREWALL UNCHANGED
-- -----------------------------------------------------------------------------
-- New RPC is SECURITY DEFINER, owned by regulatory_ingest_worker (same
-- as regulatory_ingest_persist). It only reads — never writes — so the
-- worker's zero hub_* grants property is irrelevant here, but the
-- ownership keeps the firewall pattern consistent.
-- =============================================================================

BEGIN;


-- 1. Extension.
CREATE EXTENSION IF NOT EXISTS vector;


-- 2. Column.
ALTER TABLE public.regulatory_sections
  ADD COLUMN IF NOT EXISTS embedding vector(1024);


-- 3. Index. NOT IF NOT EXISTS — we want a hard error if a stale index
--    name exists with different params.
DROP INDEX IF EXISTS public.regulatory_sections_embedding_idx;
CREATE INDEX regulatory_sections_embedding_idx
  ON public.regulatory_sections
  USING hnsw (embedding vector_cosine_ops);


-- 4. find_similar_section RPC.
--
-- Why text-typed p_embedding instead of vector(1024):
-- PostgREST serializes RPC params as JSON; passing a JSON array as
-- type vector(1024) works but requires the JS client to know the type.
-- Accepting text and casting inside is simpler — the JS caller just
-- sends the pgvector text format '[0.1,0.2,...]' and the function
-- handles the cast.
--
-- Returns top-N most similar non-null-embedding sections, with
-- similarity = 1 - cosine_distance (so 1.0 is identical, 0.0 is
-- orthogonal). NULL-embedding rows are excluded — those are sections
-- that pre-date this migration and haven't been backfilled yet; the
-- backfill script must run before the diff layer is meaningful.

CREATE OR REPLACE FUNCTION public.find_similar_section(
  p_embedding text,
  p_limit     int DEFAULT 1
) RETURNS TABLE (
  id            uuid,
  document_id   uuid,
  ordinal       int,
  heading       text,
  content_text  text,
  document_title text,
  similarity    float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    s.id,
    s.document_id,
    s.ordinal,
    s.heading,
    s.content_text,
    d.title AS document_title,
    1 - (s.embedding <=> (p_embedding::vector(1024))) AS similarity
  FROM public.regulatory_sections s
  JOIN public.regulatory_documents d ON d.id = s.document_id
  WHERE s.embedding IS NOT NULL
  ORDER BY s.embedding <=> (p_embedding::vector(1024))
  LIMIT GREATEST(p_limit, 1);
$$;

ALTER FUNCTION public.find_similar_section(text, int)
  OWNER TO regulatory_ingest_worker;

REVOKE EXECUTE ON FUNCTION public.find_similar_section(text, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.find_similar_section(text, int) TO service_role;


-- 5. Verification.

-- (a) Extension installed.
SELECT extname, extversion
  FROM pg_extension
 WHERE extname = 'vector';
-- Expected: 1 row, extversion non-null

-- (b) Column exists, correct type, nullable.
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'regulatory_sections'
   AND column_name = 'embedding';
-- Expected: embedding | USER-DEFINED | YES

-- (c) Index exists and is HNSW.
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND indexname = 'regulatory_sections_embedding_idx';
-- Expected: 1 row, indexdef contains 'USING hnsw'

-- (d) RPC exists, owned by worker, SECURITY DEFINER.
SELECT proname, pg_get_userbyid(proowner) AS owner, prosecdef
  FROM pg_proc
 WHERE proname = 'find_similar_section'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: owner='regulatory_ingest_worker', prosecdef=true

-- (e) Firewall sanity (unchanged from 029).
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'regulatory_ingest_worker'
   AND table_schema = 'public'
   AND table_name LIKE 'hub_%';
-- Expected: 0

-- (f) Count of sections still needing backfill (informational only).
SELECT COUNT(*)::int AS sections_missing_embedding
  FROM public.regulatory_sections
 WHERE embedding IS NULL;
-- Expected after fresh apply: equal to existing row count (e.g. 6).
-- After running scripts/backfill-section-embeddings.ts: 0.

COMMIT;
