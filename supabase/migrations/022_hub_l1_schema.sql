-- =============================================================================
-- 022_hub_l1_schema.sql
--
-- L1 "Hub" — the global, multi-tenant compliance knowledge vault that
-- Roy + Amir curate and that every customer org reads from. NOT to be
-- confused with the "hub-and-spoke agent topology" which was a prior
-- naming collision; that's L3+. This migration adds L1 only.
--
-- Versioning model: every artifact has (template_id, version). template_id
-- is the logical stable identifier; new versions of an artifact are new
-- rows with the same template_id and version+1, and the old version stays
-- for history. Customers always read the latest active version per
-- template_id.
--
-- Tables created:
--   hub_asset_templates       (asset TYPES — cameras, mailing list, etc.)
--   hub_questions             (discovery questions per asset type)
--   hub_document_templates    (text templates with variables)
--   hub_control_playbooks     (periodic compliance controls)
--   hub_gap_rules             (declarative compliance-gap detection)
--   hub_continuation_services (Deepo upsell catalog)
--
-- Schema-tier policy: SELECT for any authenticated caller (this is
-- everyone's compliance library); writes via service_role only (Expert
-- Console uses server-side endpoints). No service_role policies — it
-- bypasses RLS automatically, per the 017 / 019 convention.
--
-- users.role pre-existing: this column is already an ENUM (user_role) with
-- values admin/employee/viewer. We ADD VALUE 'expert_curator' rather than
-- ADD COLUMN. Bootstrapping curators (Roy + Amir + Adam) is a separate
-- post-migration manual UPDATE — not part of this file.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ENUMs
-- -----------------------------------------------------------------------------

CREATE TYPE hub_source_tier AS ENUM (
  'legal',
  'regulatory_guidance',
  'industry_norm',
  'expert_judgment'
);

-- Extend existing user_role enum with the curator role. Postgres 12+
-- allows ALTER TYPE ADD VALUE inside a transaction; the new value cannot
-- be used in the SAME transaction. Bootstrap UPDATE is a separate step
-- run by an operator after this migration commits.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'expert_curator';


-- -----------------------------------------------------------------------------
-- 2. hub_asset_templates
-- -----------------------------------------------------------------------------

CREATE TABLE public.hub_asset_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL DEFAULT gen_random_uuid(),
  version               INT NOT NULL DEFAULT 1,
  active                BOOLEAN NOT NULL DEFAULT true,
  slug                  TEXT NOT NULL,
  name                  TEXT NOT NULL,
  definition            TEXT NOT NULL,
  icon_name             TEXT,
  source_tier           hub_source_tier NOT NULL DEFAULT 'expert_judgment',
  confidence            FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  last_reviewed_at      TIMESTAMPTZ,
  reviewed_by           TEXT,
  related_sources       TEXT[] NOT NULL DEFAULT '{}',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (template_id, version),
  UNIQUE (slug, version)
);


-- -----------------------------------------------------------------------------
-- 3. hub_questions
-- -----------------------------------------------------------------------------

CREATE TABLE public.hub_questions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL DEFAULT gen_random_uuid(),
  version               INT NOT NULL DEFAULT 1,
  active                BOOLEAN NOT NULL DEFAULT true,
  asset_template_id     UUID NOT NULL,
  order_index           INT NOT NULL,
  question_text         TEXT NOT NULL,
  question_type         TEXT NOT NULL CHECK (question_type IN ('text', 'number', 'boolean', 'single_choice', 'multi_choice', 'list', 'date')),
  choices               JSONB,
  required              BOOLEAN NOT NULL DEFAULT false,
  help_text             TEXT,
  depends_on            JSONB,
  source_tier           hub_source_tier NOT NULL DEFAULT 'expert_judgment',
  confidence            FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  last_reviewed_at      TIMESTAMPTZ,
  reviewed_by           TEXT,
  related_sources       TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (template_id, version)
);


-- -----------------------------------------------------------------------------
-- 4. hub_document_templates
-- -----------------------------------------------------------------------------

CREATE TABLE public.hub_document_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL DEFAULT gen_random_uuid(),
  version               INT NOT NULL DEFAULT 1,
  active                BOOLEAN NOT NULL DEFAULT true,
  asset_template_id     UUID NOT NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  body                  TEXT NOT NULL,
  variables             JSONB NOT NULL DEFAULT '[]',
  output_format         TEXT NOT NULL DEFAULT 'markdown' CHECK (output_format IN ('markdown', 'html', 'plain')),
  source_tier           hub_source_tier NOT NULL DEFAULT 'expert_judgment',
  confidence            FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  last_reviewed_at      TIMESTAMPTZ,
  reviewed_by           TEXT,
  related_sources       TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (template_id, version)
);


-- -----------------------------------------------------------------------------
-- 5. hub_control_playbooks
-- -----------------------------------------------------------------------------

CREATE TABLE public.hub_control_playbooks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL DEFAULT gen_random_uuid(),
  version               INT NOT NULL DEFAULT 1,
  active                BOOLEAN NOT NULL DEFAULT true,
  asset_template_id     UUID NOT NULL,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL,
  cadence               TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly', 'quarterly', 'biannual', 'annual')),
  owner_role            TEXT,
  checklist             JSONB NOT NULL DEFAULT '[]',
  source_tier           hub_source_tier NOT NULL DEFAULT 'expert_judgment',
  confidence            FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  last_reviewed_at      TIMESTAMPTZ,
  reviewed_by           TEXT,
  related_sources       TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (template_id, version)
);


-- -----------------------------------------------------------------------------
-- 6. hub_gap_rules
-- -----------------------------------------------------------------------------

CREATE TABLE public.hub_gap_rules (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id                 UUID NOT NULL DEFAULT gen_random_uuid(),
  version                     INT NOT NULL DEFAULT 1,
  active                      BOOLEAN NOT NULL DEFAULT true,
  asset_template_id           UUID NOT NULL,
  name                        TEXT NOT NULL,
  description                 TEXT NOT NULL,
  severity                    TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  rule_dsl                    JSONB NOT NULL,
  remediation_text            TEXT,
  continuation_service_ids    UUID[] NOT NULL DEFAULT '{}',
  source_tier                 hub_source_tier NOT NULL DEFAULT 'expert_judgment',
  confidence                  FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  last_reviewed_at            TIMESTAMPTZ,
  reviewed_by                 TEXT,
  related_sources             TEXT[] NOT NULL DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (template_id, version)
);


-- -----------------------------------------------------------------------------
-- 7. hub_continuation_services
-- -----------------------------------------------------------------------------

CREATE TABLE public.hub_continuation_services (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL DEFAULT gen_random_uuid(),
  version               INT NOT NULL DEFAULT 1,
  active                BOOLEAN NOT NULL DEFAULT true,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL,
  price_model           TEXT CHECK (price_model IS NULL OR price_model IN ('one_time', 'recurring', 'quote')),
  estimated_price_text  TEXT,
  service_kind          TEXT NOT NULL,
  source_tier           hub_source_tier NOT NULL DEFAULT 'expert_judgment',
  confidence            FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  last_reviewed_at      TIMESTAMPTZ,
  reviewed_by           TEXT,
  related_sources       TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (template_id, version)
);


-- -----------------------------------------------------------------------------
-- 8. Indexes — one set per table
--    "latest active version" lookups are the dominant read pattern
-- -----------------------------------------------------------------------------

-- hub_asset_templates
CREATE INDEX idx_hub_asset_templates_template_active
  ON public.hub_asset_templates (template_id, version DESC) WHERE active = true;
CREATE INDEX idx_hub_asset_templates_source_tier
  ON public.hub_asset_templates (source_tier);

-- hub_questions
CREATE INDEX idx_hub_questions_template_active
  ON public.hub_questions (template_id, version DESC) WHERE active = true;
CREATE INDEX idx_hub_questions_asset_template
  ON public.hub_questions (asset_template_id) WHERE active = true;
CREATE INDEX idx_hub_questions_source_tier
  ON public.hub_questions (source_tier);

-- hub_document_templates
CREATE INDEX idx_hub_document_templates_template_active
  ON public.hub_document_templates (template_id, version DESC) WHERE active = true;
CREATE INDEX idx_hub_document_templates_asset_template
  ON public.hub_document_templates (asset_template_id) WHERE active = true;
CREATE INDEX idx_hub_document_templates_source_tier
  ON public.hub_document_templates (source_tier);

-- hub_control_playbooks
CREATE INDEX idx_hub_control_playbooks_template_active
  ON public.hub_control_playbooks (template_id, version DESC) WHERE active = true;
CREATE INDEX idx_hub_control_playbooks_asset_template
  ON public.hub_control_playbooks (asset_template_id) WHERE active = true;
CREATE INDEX idx_hub_control_playbooks_source_tier
  ON public.hub_control_playbooks (source_tier);

-- hub_gap_rules
CREATE INDEX idx_hub_gap_rules_template_active
  ON public.hub_gap_rules (template_id, version DESC) WHERE active = true;
CREATE INDEX idx_hub_gap_rules_asset_template
  ON public.hub_gap_rules (asset_template_id) WHERE active = true;
CREATE INDEX idx_hub_gap_rules_source_tier
  ON public.hub_gap_rules (source_tier);

-- hub_continuation_services
CREATE INDEX idx_hub_continuation_services_template_active
  ON public.hub_continuation_services (template_id, version DESC) WHERE active = true;
CREATE INDEX idx_hub_continuation_services_source_tier
  ON public.hub_continuation_services (source_tier);


-- -----------------------------------------------------------------------------
-- 9. RLS — SELECT for authenticated, no write policies (service_role only)
-- -----------------------------------------------------------------------------

ALTER TABLE public.hub_asset_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_questions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_document_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_control_playbooks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_gap_rules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_continuation_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_asset_templates_select_all_authenticated"       ON public.hub_asset_templates       FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_questions_select_all_authenticated"             ON public.hub_questions             FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_document_templates_select_all_authenticated"    ON public.hub_document_templates    FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_control_playbooks_select_all_authenticated"     ON public.hub_control_playbooks     FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_gap_rules_select_all_authenticated"             ON public.hub_gap_rules             FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_continuation_services_select_all_authenticated" ON public.hub_continuation_services FOR SELECT TO authenticated USING (true);


-- -----------------------------------------------------------------------------
-- 10. Verification — all 6 Hub tables should be empty (no seeds in this
--     migration), and the user_role enum should now include 'expert_curator'.
-- -----------------------------------------------------------------------------

SELECT 'hub_asset_templates'       AS tbl, COUNT(*)::int AS n FROM public.hub_asset_templates
UNION ALL SELECT 'hub_questions',             COUNT(*)::int FROM public.hub_questions
UNION ALL SELECT 'hub_document_templates',    COUNT(*)::int FROM public.hub_document_templates
UNION ALL SELECT 'hub_control_playbooks',     COUNT(*)::int FROM public.hub_control_playbooks
UNION ALL SELECT 'hub_gap_rules',             COUNT(*)::int FROM public.hub_gap_rules
UNION ALL SELECT 'hub_continuation_services', COUNT(*)::int FROM public.hub_continuation_services
UNION ALL SELECT 'user_role_expert_curator_present', (SELECT COUNT(*)::int FROM pg_enum WHERE enumlabel = 'expert_curator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role'));
-- Expected: rows 1-6 = 0, row 7 ('user_role_expert_curator_present') = 1

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECT
-- still prints but nothing persists. Note: even on ROLLBACK, the
-- ALTER TYPE ADD VALUE statement is conditional (IF NOT EXISTS) so the
-- dry-run is safely repeatable.
