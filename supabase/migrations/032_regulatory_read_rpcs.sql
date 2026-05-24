-- =============================================================================
-- 032_regulatory_read_rpcs.sql
--
-- Bypasses PostgREST for regulatory read paths by exposing two
-- SECURITY DEFINER RPCs:
--
--   list_regulatory_documents()        — list endpoint
--   list_regulatory_documents_stats()  — stats endpoint (single roundtrip)
--
-- A third RPC (find_document_by_file_hash) was intended for this
-- migration but is deferred to 033, because it references the
-- file_content_hash column which 033 adds. Postgres validates SQL
-- function bodies at CREATE time (check_function_bodies=true), so
-- defining the RPC here would fail with "column does not exist".
-- Migrations stay in numeric order; the RPC just lives with the
-- column it depends on.
--
-- -----------------------------------------------------------------------------
-- WHY RPC INSTEAD OF .from().select()
-- -----------------------------------------------------------------------------
-- After migrations 030/031 added the embedding column and rewrote the
-- ingest function, the PostgREST schema cache went into a state where
-- `SELECT * FROM regulatory_documents WHERE superseded_by IS NULL`
-- returned ZERO rows via supabase-js despite returning 5 rows in raw
-- SQL — verified end-to-end:
--   - rowsecurity = false
--   - service_role has SELECT (has_table_privilege confirms)
--   - no views/rules/triggers intercepting
--   - same Supabase project (writes via the same client succeed)
--   - NOTIFY pgrst, 'reload schema' did not fix it
--
-- The PostgREST layer is the only thing left, and we've spent enough
-- iterations debugging it. RPCs sidestep PostgREST's table-shape
-- introspection entirely — the function body is just SQL, returned as
-- a typed result set.
--
-- This matches the pattern we already use for writes
-- (regulatory_ingest_persist) and similarity lookups
-- (find_similar_section, migration 030). All regulatory read+write
-- paths now route through SECURITY DEFINER functions owned by the
-- worker. Consistent + immune to PostgREST quirks.
--
-- -----------------------------------------------------------------------------
-- FIREWALL UNCHANGED
-- -----------------------------------------------------------------------------
-- Same SECURITY DEFINER + owner=regulatory_ingest_worker + EXECUTE-to-
-- service_role-only pattern as every other RPC. Worker still has zero
-- grants on hub_* tables (verified at the bottom).
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- 1. list_regulatory_documents — replaces the .from().select() in the
--    list route. Returns the non-superseded set, newest first, capped at 200.
-- -----------------------------------------------------------------------------

-- section_count is bundled into the return shape so the route can
-- avoid a second supabase-js call on regulatory_sections. Same
-- PostgREST risk applies to that table; one RPC call covers both.
CREATE OR REPLACE FUNCTION public.list_regulatory_documents()
RETURNS TABLE (
  id            uuid,
  url           text,
  title         text,
  source_org    regulatory_source_org,
  version       int,
  content_hash  text,
  fetched_at    timestamptz,
  metadata      jsonb,
  section_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT d.id, d.url, d.title, d.source_org, d.version,
         d.content_hash, d.fetched_at, d.metadata,
         COALESCE(
           (SELECT COUNT(*)::int FROM regulatory_sections s
             WHERE s.document_id = d.id),
           0
         ) AS section_count
    FROM regulatory_documents d
   WHERE d.superseded_by IS NULL
   ORDER BY d.fetched_at DESC
   LIMIT 200;
$$;

ALTER FUNCTION public.list_regulatory_documents() OWNER TO regulatory_ingest_worker;
REVOKE EXECUTE ON FUNCTION public.list_regulatory_documents() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.list_regulatory_documents() TO service_role;


-- -----------------------------------------------------------------------------
-- 2. list_regulatory_documents_stats — replaces the stats endpoint's
--    multi-query pattern with a single jsonb roundtrip. Mirrors the
--    response shape the stats endpoint already returns:
--
--      {
--        total_documents: int,
--        total_sections:  int,
--        documents_by_source: { pdf_upload: 5, ... },
--        latest_uploads: [{ id, title, version, fetched_at, section_count }, ...]
--      }
--
-- Returns jsonb so the endpoint can pass it straight through to the
-- HTTP response with no remapping.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_regulatory_documents_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  WITH docs AS (
    SELECT id, title, version, fetched_at, metadata
      FROM regulatory_documents
     WHERE superseded_by IS NULL
  ),
  section_counts AS (
    SELECT s.document_id, COUNT(*)::int AS section_count
      FROM regulatory_sections s
     WHERE s.document_id IN (SELECT id FROM docs)
     GROUP BY s.document_id
  ),
  by_source AS (
    SELECT COALESCE(d.metadata->>'source', 'unknown') AS source,
           COUNT(*)::int AS cnt
      FROM docs d
     GROUP BY 1
  ),
  latest AS (
    SELECT d.id, d.title, d.version, d.fetched_at,
           COALESCE(sc.section_count, 0) AS section_count
      FROM docs d
      LEFT JOIN section_counts sc ON sc.document_id = d.id
     ORDER BY d.fetched_at DESC
     LIMIT 5
  )
  SELECT jsonb_build_object(
    'total_documents',     (SELECT COUNT(*)::int FROM docs),
    'total_sections',      COALESCE((SELECT SUM(section_count)::int FROM section_counts), 0),
    'documents_by_source', COALESCE(
                             (SELECT jsonb_object_agg(source, cnt) FROM by_source),
                             '{}'::jsonb
                           ),
    'latest_uploads',      COALESCE(
                             (SELECT jsonb_agg(
                                       jsonb_build_object(
                                         'id',            id,
                                         'title',         title,
                                         'version',       version,
                                         'fetched_at',    fetched_at,
                                         'section_count', section_count
                                       )
                                       ORDER BY fetched_at DESC
                                     )
                                FROM latest),
                             '[]'::jsonb
                           )
  );
$$;

ALTER FUNCTION public.list_regulatory_documents_stats() OWNER TO regulatory_ingest_worker;
REVOKE EXECUTE ON FUNCTION public.list_regulatory_documents_stats() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.list_regulatory_documents_stats() TO service_role;


-- -----------------------------------------------------------------------------
-- 3. Verification
-- -----------------------------------------------------------------------------

-- (a) Both RPCs exist, owned by worker, SECURITY DEFINER on.
SELECT proname, pg_get_userbyid(proowner) AS owner, prosecdef
  FROM pg_proc
 WHERE proname IN (
         'list_regulatory_documents',
         'list_regulatory_documents_stats'
       )
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
 ORDER BY proname;
-- Expected: 2 rows, all owner='regulatory_ingest_worker', prosecdef=true

-- (b) Smoke test the list RPC — should match the 5 rows we see in raw SQL.
SELECT COUNT(*)::int AS list_rpc_row_count
  FROM public.list_regulatory_documents();
-- Expected: matches non-superseded count in regulatory_documents (today: 5)

-- (c) Smoke test stats RPC.
SELECT public.list_regulatory_documents_stats();
-- Expected: jsonb with total_documents, total_sections, etc.

-- (d) FIREWALL SANITY: worker still has zero grants on hub_* tables.
SELECT COUNT(*)::int AS worker_hub_grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'regulatory_ingest_worker'
   AND table_schema = 'public'
   AND table_name LIKE 'hub_%';
-- Expected: 0

COMMIT;
