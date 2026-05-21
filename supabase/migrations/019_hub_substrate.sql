-- =============================================================================
-- 019_hub_substrate.sql
--
-- Hub-and-spoke substrate: persona registry, shared org facts, per-agent
-- scratchpad, full conversation capture, plus column additions to existing
-- tables for persona attribution and feature flagging.
--
-- RLS strategy: follows migration 017 conventions.
--   - SELECT policies for `authenticated` (org-scoped where applicable) using
--     the (users.auth_user_id = auth.uid()) join pattern.
--   - NO service_role policies. service_role bypasses RLS automatically, so
--     additional ALL policies for it would only widen the attack surface
--     (the lesson from 017).
--   - Write paths (INSERT/UPDATE/DELETE) happen via service-role only.
--
-- Apply procedure (manual): paste into Supabase SQL Editor, change COMMIT
-- to ROLLBACK to dry-run, verify counts in the bottom block, then change
-- back to COMMIT and re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Column additions to existing tables
-- -----------------------------------------------------------------------------

-- Persona attribution on notifications. NULL = legacy / system notification
-- from before personas existed; not backfilling on purpose.
ALTER TABLE public.notifications ADD COLUMN actor TEXT;
ALTER TABLE public.notifications ADD COLUMN actor_role TEXT;

-- Per-org feature flags. Empty object means "all defaults". Hub-and-spoke
-- features will gate on keys like {"hub_enabled": true, "cameras_agent": true}.
ALTER TABLE public.organizations
  ADD COLUMN feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Persona attribution on chat messages. NULL for user messages and for
-- legacy assistant messages from before personas existed.
ALTER TABLE public.chat_messages ADD COLUMN persona_slug TEXT;


-- -----------------------------------------------------------------------------
-- 2. team_personas — single source of truth for persona identity
-- -----------------------------------------------------------------------------
CREATE TABLE public.team_personas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,
  display_name_he     TEXT NOT NULL,
  role_he             TEXT NOT NULL,
  system_prompt_key   TEXT NOT NULL,
  domain_ownership    TEXT[] NOT NULL,
  avatar_seed         TEXT NOT NULL,
  color               TEXT NOT NULL,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_personas ENABLE ROW LEVEL SECURITY;

-- All authenticated users may read the persona list (UI needs to render
-- "Dana said..." attribution everywhere). No write policies — service_role
-- bypasses RLS.
CREATE POLICY "team_personas_select_all" ON public.team_personas
  FOR SELECT TO authenticated
  USING (true);


-- -----------------------------------------------------------------------------
-- 3. org_facts — shared knowledge any persona can read/write
-- -----------------------------------------------------------------------------
CREATE TABLE public.org_facts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fact_key            TEXT NOT NULL,
  fact_value          JSONB NOT NULL,
  source              TEXT NOT NULL,
  confidence          FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  last_verified_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, fact_key)
);

ALTER TABLE public.org_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_facts_select_own_org" ON public.org_facts
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));


-- -----------------------------------------------------------------------------
-- 4. agent_scratchpad — per-persona reasoning store (internal only)
-- -----------------------------------------------------------------------------
CREATE TABLE public.agent_scratchpad (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  persona_slug        TEXT NOT NULL,
  scratch_key         TEXT NOT NULL,
  scratch_value       JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, persona_slug, scratch_key)
);

-- RLS enabled but no policies → only service_role can access. This is
-- intentional: scratchpad is internal agent state, never exposed to clients.
ALTER TABLE public.agent_scratchpad ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 5. agent_runs — full Claude conversation capture per invocation
-- -----------------------------------------------------------------------------
CREATE TABLE public.agent_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  persona_slug        TEXT NOT NULL,
  trigger_type        TEXT NOT NULL CHECK (trigger_type IN ('cron', 'event', 'user')),
  trigger_payload     JSONB,
  status              TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  input               JSONB NOT NULL,
  output              JSONB,
  error               TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  parent_run_id       UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  inngest_run_id      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_runs_select_own_org" ON public.agent_runs
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));


-- -----------------------------------------------------------------------------
-- 6. Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_agent_runs_org_persona_created
  ON public.agent_runs (org_id, persona_slug, created_at DESC);

CREATE INDEX idx_agent_runs_status
  ON public.agent_runs (status)
  WHERE status IN ('queued', 'running');

CREATE INDEX idx_org_facts_lookup
  ON public.org_facts (org_id, fact_key);

CREATE INDEX idx_agent_scratchpad_lookup
  ON public.agent_scratchpad (org_id, persona_slug, scratch_key);

CREATE INDEX idx_notifications_actor
  ON public.notifications (actor)
  WHERE actor IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 7. Persona seeds
-- -----------------------------------------------------------------------------
INSERT INTO public.team_personas
  (slug, display_name_he, role_he, system_prompt_key, domain_ownership, avatar_seed, color, active)
VALUES
  ('dana',  'עו"ד דנה כהן',  'מנהלת הגנת הפרטיות ומיפוי נתונים', 'DANA_SYSTEM_PROMPT',  ARRAY['cameras','ropa','dsar'],            'dana-deepo',  '#7F77DD', true),
  ('yossi', 'יוסי לוי',       'מומחה אבטחת מידע וניהול אירועים',   'YOSSI_SYSTEM_PROMPT', ARRAY['incidents','controls','security'], 'yossi-deepo', '#1D9E75', true),
  ('tamar', 'תמר אשכנזי',     'מומחית זכויות נושאי מידע והסכמות',  'TAMAR_SYSTEM_PROMPT', ARRAY['consent','rights'],                 'tamar-deepo', '#D85A30', true);


-- -----------------------------------------------------------------------------
-- 8. Verification — counts should be:
--    team_personas       3
--    org_facts           0
--    agent_scratchpad    0
--    agent_runs          0
--    organizations.feature_flags column exists, default '{}'::jsonb
--    notifications.actor column exists, NULL for all 0 existing rows
--    chat_messages.persona_slug column exists, NULL for all 0 existing rows
-- -----------------------------------------------------------------------------
SELECT 'team_personas'    AS tbl, COUNT(*) AS n FROM public.team_personas;
SELECT 'org_facts'        AS tbl, COUNT(*) AS n FROM public.org_facts;
SELECT 'agent_scratchpad' AS tbl, COUNT(*) AS n FROM public.agent_scratchpad;
SELECT 'agent_runs'       AS tbl, COUNT(*) AS n FROM public.agent_runs;

-- Sanity: confirm columns exist (returns row if all columns present)
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications'   AND column_name IN ('actor','actor_role')) AS notifications_added,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations'   AND column_name='feature_flags')           AS organizations_added,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='chat_messages'   AND column_name='persona_slug')            AS chat_messages_added;
-- Expected: notifications_added=2, organizations_added=1, chat_messages_added=1

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECTs still
-- print but nothing persists.
