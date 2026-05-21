-- =============================================================================
-- 023_regulatory_sources.sql
--
-- Regulatory ingest schema. Public Israeli privacy regulation is fetched
-- and stored in regulatory_* tables. Curators in the Expert Console read
-- these sources and translate them INTO Hub artifacts. Hub artifacts cite
-- the source sections via a separate join table.
--
-- ARCHITECTURAL FIREWALL — do not break:
--   Regulatory sources are NOT Hub artifacts.
--   The ingest pipeline writes to regulatory_* tables ONLY.
--   The ingest pipeline NEVER writes to hub_* tables.
--   Hub artifacts are authored by curators in the Expert Console.
--   Citations connect the two without merging them.
--
-- Defense in depth:
--   1. Architectural: ingest worker code lives in src/lib/regulatory/* and
--      only imports regulatory_* table names. No hub_* writes by design.
--   2. Postgres-level: the regulatory_ingest_worker DB role has GRANTs on
--      regulatory_* tables only. Even if app code is later modified to
--      attempt hub_* writes from the worker, Postgres refuses the operation.
--
-- Pattern note (deviates slightly from initial spec):
--   - Spec said "no INSERT/UPDATE/DELETE policies — service role bypasses
--     RLS" and ALSO said "ingest worker uses regulatory_ingest_worker
--     role, NOT service_role". Those are contradictory — a non-service_role
--     role IS subject to RLS. To preserve the firewall intent (worker is
--     NOT service_role) we add explicit INSERT/UPDATE policies scoped to
--     the regulatory_ingest_worker role on the two regulatory tables.
--     Service role still bypasses RLS automatically; curators use it via
--     /api/expert/* routes when writing hub_artifact_citations.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Extensions — pgcrypto for gen_random_uuid(), defensive
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- -----------------------------------------------------------------------------
-- 1. Enum: regulatory_source_org
-- -----------------------------------------------------------------------------
CREATE TYPE regulatory_source_org AS ENUM (
  'privacy_protection_authority',
  'knesset',
  'court',
  'eu_edpb',
  'other'
);


-- -----------------------------------------------------------------------------
-- 2. regulatory_documents — top-level fetched documents
--
--    Versioning: when the same URL is re-fetched and content_hash differs,
--    insert a new row with version+1. The old row's superseded_by gets set
--    to the new row's id. Latest version = WHERE superseded_by IS NULL.
-- -----------------------------------------------------------------------------
CREATE TABLE public.regulatory_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url             TEXT NOT NULL,
  title           TEXT NOT NULL,
  source_org      regulatory_source_org NOT NULL,
  version         INT NOT NULL DEFAULT 1,
  content_hash    TEXT NOT NULL,       -- SHA256 of plain text
  raw_html        TEXT,                -- preserve original for re-parsing
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_by   UUID REFERENCES public.regulatory_documents(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (url, version)
);


-- -----------------------------------------------------------------------------
-- 3. regulatory_sections — sectioned content within a document
--
--    ordinal preserves document order; anchor is the citable identifier
--    (e.g. 'section_17b') that curators link to.
-- -----------------------------------------------------------------------------
CREATE TABLE public.regulatory_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES public.regulatory_documents(id) ON DELETE CASCADE,
  ordinal         INT NOT NULL,
  heading         TEXT,                -- nullable; some sections lack headings
  anchor          TEXT,                -- URL anchor / section number
  content_text    TEXT NOT NULL,
  content_hash    TEXT NOT NULL,       -- per-section hash for change detection
  UNIQUE (document_id, ordinal)
);


-- -----------------------------------------------------------------------------
-- 4. hub_artifact_citations — bridges Hub artifacts to regulatory sections
--
--    Polymorphic FK: artifact_table + artifact_id is application-enforced
--    referential integrity. No DB-level FK because the target table is
--    dynamic (could be hub_asset_templates, hub_questions, etc.). The
--    artifact_version field binds the citation to a specific version of the
--    artifact — when curators bump an artifact version, citations should be
--    re-pinned to the new version explicitly (not auto-migrated).
-- -----------------------------------------------------------------------------
CREATE TABLE public.hub_artifact_citations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_table          TEXT NOT NULL,
  artifact_id             UUID NOT NULL,
  artifact_version        INT NOT NULL,
  regulatory_section_id   UUID NOT NULL REFERENCES public.regulatory_sections(id) ON DELETE RESTRICT,
  note                    TEXT,
  created_by              UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 5. Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX idx_regulatory_documents_url           ON public.regulatory_documents (url);
CREATE INDEX idx_regulatory_documents_source_org    ON public.regulatory_documents (source_org);
CREATE INDEX idx_regulatory_documents_current
  ON public.regulatory_documents (url, version DESC)
  WHERE superseded_by IS NULL;

CREATE INDEX idx_regulatory_sections_document       ON public.regulatory_sections (document_id, ordinal);

CREATE INDEX idx_hub_artifact_citations_artifact
  ON public.hub_artifact_citations (artifact_table, artifact_id, artifact_version);
CREATE INDEX idx_hub_artifact_citations_section
  ON public.hub_artifact_citations (regulatory_section_id);


-- -----------------------------------------------------------------------------
-- 6. Postgres-level firewall: regulatory_ingest_worker role
--
--    Defense in depth against the "auto-feed Hub" antipattern. If
--    application code is ever modified to write to hub_* tables from the
--    ingest worker, Postgres rejects the write because the role has no
--    grants on those tables.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'regulatory_ingest_worker') THEN
    CREATE ROLE regulatory_ingest_worker NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO regulatory_ingest_worker;

-- Read/write on regulatory tables only. Deliberately NO DELETE — superseding
-- happens via superseded_by, not deletion.
GRANT SELECT, INSERT, UPDATE ON public.regulatory_documents TO regulatory_ingest_worker;
GRANT SELECT, INSERT, UPDATE ON public.regulatory_sections  TO regulatory_ingest_worker;

-- Future-proof: any sequences added later in public get usage. Currently
-- no sequences exist (we use UUID PKs), so this is defensive.
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO regulatory_ingest_worker;

-- EXPLICITLY no grants on hub_* tables. The worker cannot author Hub
-- artifacts. If a curator changes app code to attempt it, the write fails
-- at the DB layer with a clear permission error.


-- -----------------------------------------------------------------------------
-- 7. RLS
--
--    SELECT: authenticated may read regulatory_* and hub_artifact_citations
--    (curators read sources via Expert Console; future agent reads via
--    service_role which bypasses RLS).
--
--    INSERT/UPDATE on regulatory_documents + regulatory_sections: scoped
--    to the regulatory_ingest_worker role. Required because that role is
--    NOT service_role and therefore IS subject to RLS — without these
--    policies the firewall role couldn't write anything, defeating its
--    purpose.
--
--    No write policies on hub_artifact_citations — service_role bypasses
--    RLS and curator endpoints use service_role for writes.
-- -----------------------------------------------------------------------------

ALTER TABLE public.regulatory_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_artifact_citations   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regulatory_documents_select_authenticated"
  ON public.regulatory_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "regulatory_sections_select_authenticated"
  ON public.regulatory_sections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hub_artifact_citations_select_authenticated"
  ON public.hub_artifact_citations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "regulatory_documents_insert_ingest_worker"
  ON public.regulatory_documents
  FOR INSERT TO regulatory_ingest_worker WITH CHECK (true);

CREATE POLICY "regulatory_documents_update_ingest_worker"
  ON public.regulatory_documents
  FOR UPDATE TO regulatory_ingest_worker USING (true) WITH CHECK (true);

CREATE POLICY "regulatory_sections_insert_ingest_worker"
  ON public.regulatory_sections
  FOR INSERT TO regulatory_ingest_worker WITH CHECK (true);

CREATE POLICY "regulatory_sections_update_ingest_worker"
  ON public.regulatory_sections
  FOR UPDATE TO regulatory_ingest_worker USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 8. Verification
--    Expected: 3 tables (empty), 1 enum (5 values), 1 role.
-- -----------------------------------------------------------------------------

SELECT 'regulatory_documents'    AS tbl, COUNT(*)::int AS n FROM public.regulatory_documents
UNION ALL SELECT 'regulatory_sections',   COUNT(*)::int FROM public.regulatory_sections
UNION ALL SELECT 'hub_artifact_citations', COUNT(*)::int FROM public.hub_artifact_citations
UNION ALL SELECT 'enum_values', (SELECT COUNT(*)::int FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'regulatory_source_org'))
UNION ALL SELECT 'ingest_role_present', (SELECT COUNT(*)::int FROM pg_roles WHERE rolname = 'regulatory_ingest_worker');
-- Expected: 0 / 0 / 0 / 5 / 1

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECTs
-- still print but nothing persists.
