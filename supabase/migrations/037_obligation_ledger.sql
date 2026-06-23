-- =============================================================================
-- 037_obligation_ledger.sql
--
-- v3 Obligation Ledger (L3) - the per-client living compliance state.
-- ADDITIVE ONLY: creates new tables + one enum. Zero changes to existing
-- tables. Anchored to the VERIFIED live schema (supabase/baseline/
-- baseline-20260622.sql), not the drifted migration history. Built to
-- docs/ARCHITECTURE.md section 5.2.
--
-- Tables created (the ledger):
--   assets       - per-org asset instances, typed by hub_asset_templates
--   contacts      - per-org people (owner / sysadmin / dpo / vendor contact)
--   controls      - per-org instances of hub_control_playbooks (recurring engine)
--   obligations   - the heart: one client-specific instance of a catalog rule, with state
--   tasks         - actionable work items (broader loop; distinct from dpo_queue)
--   evidence      - proof fulfilling an obligation (the missing relation)
--   events        - per-org append-only ledger timeline (material state changes)
-- Enum created:
--   obligation_status (unknown, checking, in_treatment, compliant, expired)
--
-- PROVENANCE / FK ANCHORING:
--   The hub catalog's logical identity is (template_id, version) - id is the
--   per-version physical row, and (template_id, version) is uniquely
--   constrained on every hub_* table. So provenance FKs are COMPOSITE to
--   (template_id, version), which pins exactly which catalog version minted
--   an obligation / control / asset:
--     obligations (source_rule_id, source_version) -> hub_gap_rules(template_id, version)
--     controls    (source_playbook_id, source_playbook_version) -> hub_control_playbooks(template_id, version)
--     assets      (asset_template_id, asset_template_version)    -> hub_asset_templates(template_id, version)
--
-- DESIGN DECISIONS (the two open items from ARCHITECTURE.md sections 4 / 5.2):
--   (a) Vertical profile (L2): a dedicated vertical_profiles table, NOT a
--       tagging convention on hub_*. Tagging hub_* would require altering
--       existing tables (violates additive-only). The dedicated table is
--       deferred to the L2 task; it is NOT created here.
--   (b) systems and databases: folded under the typed assets table
--       (asset_template_id -> hub_asset_templates), per ARCHITECTURE.md 5.2
--       DECISION (2). No per-type systems/databases tables. The legacy
--       per-type cameras table is the pattern v3 generalizes away from;
--       cameras stays untouched for now (a later pass folds it under assets).
--
-- RECONCILIATIONS where 5.2 references things that do not exist yet:
--   - obligations.trigger_ref (5.2, polymorphic) is realized concretely as the
--     typed asset_id FK (the only ledger-resident trigger entity today).
--     Answer / fact references are deferred until those are first-class.
--   - tasks.access_link_id (5.2) is OMITTED: the access_links primitive does
--     not exist yet (ARCHITECTURE.md section 7 / a later PR). Added when it lands.
--   - evidence.answer_ref is a plain text reference (no answers table to FK).
--   - contacts.linked_entity (5.2) is realized as data_recipient_id -> the real
--     vendor table data_recipients. A generic system pointer is deferred.
--
-- TYPE CONVENTION: only obligation_status is a real enum (per 5.2). The other
--   small closed value sets (assignee_actor, statuses, cadence, severity, kind,
--   role, entity_type) use CHECK constraints, matching the repo convention for
--   role / enumeration text columns (data_recipients.type/status/risk_level,
--   organizations.dpo_role_in_org, hub_control_playbooks.cadence, etc.).
--
-- updated_at: columns added on all org-data tables (events is append-only and
--   has none). Triggers are handled per the live convention - see section 8.
--
-- SECURITY (per ARCHITECTURE.md section 8 + the live hub_* latent-grant lesson):
--   RLS enabled on all 7. Org-scoped policy via the existing STABLE SECURITY
--   DEFINER helper current_user_org_id(). Explicit REVOKE from anon + PUBLIC so
--   these tables never inherit a broad anon grant (the hub_* gotcha). Writes by
--   service_role bypass RLS (per the 017 / 019 / 022 convention).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ENUM
-- -----------------------------------------------------------------------------

CREATE TYPE obligation_status AS ENUM (
  'unknown',
  'checking',
  'in_treatment',
  'compliant',
  'expired'
);

-- -----------------------------------------------------------------------------
-- 2. assets  (typed by hub_asset_templates; generalizes the cameras precedent)
-- -----------------------------------------------------------------------------

CREATE TABLE public.assets (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_template_id      uuid NOT NULL,
  asset_template_version integer NOT NULL,
  name                   text NOT NULL,
  details                jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_review_due_at     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_asset_template_fkey
    FOREIGN KEY (asset_template_id, asset_template_version)
    REFERENCES public.hub_asset_templates (template_id, version)
);
CREATE INDEX idx_assets_org_id ON public.assets (org_id);

-- -----------------------------------------------------------------------------
-- 3. contacts  (unified per-org people; vendor contacts point at data_recipients)
-- -----------------------------------------------------------------------------

CREATE TABLE public.contacts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name               text NOT NULL,
  email              text,
  phone              text,
  role               text CHECK (role IN ('owner', 'sysadmin', 'dpo', 'vendor', 'other')),
  data_recipient_id  uuid REFERENCES public.data_recipients(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_org_id ON public.contacts (org_id);

-- -----------------------------------------------------------------------------
-- 4. controls  (per-org instances of hub_control_playbooks; the recurring engine)
-- -----------------------------------------------------------------------------

CREATE TABLE public.controls (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_playbook_id       uuid NOT NULL,
  source_playbook_version  integer NOT NULL,
  asset_id                 uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  cadence                  text NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly', 'quarterly', 'biannual', 'annual')),
  owner_role               text,
  next_due_at              timestamptz,
  last_completed_at        timestamptz,
  status                   text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired')),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT controls_source_playbook_fkey
    FOREIGN KEY (source_playbook_id, source_playbook_version)
    REFERENCES public.hub_control_playbooks (template_id, version)
);
CREATE INDEX idx_controls_org_id ON public.controls (org_id);

-- -----------------------------------------------------------------------------
-- 5. obligations  (the heart: one client-specific instance of a catalog rule)
-- -----------------------------------------------------------------------------

CREATE TABLE public.obligations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_rule_id          uuid,
  source_version          integer,
  title                   text NOT NULL,
  description             text,
  severity                text CHECK (severity IN ('info', 'warning', 'critical')),
  status                  obligation_status NOT NULL DEFAULT 'unknown',
  triggered_by            text,
  asset_id                uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  fulfilled_by_control_id uuid REFERENCES public.controls(id) ON DELETE SET NULL,
  recurs_at               timestamptz,
  opened_at               timestamptz NOT NULL DEFAULT now(),
  status_changed_at       timestamptz,
  closed_at               timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obligations_source_rule_fkey
    FOREIGN KEY (source_rule_id, source_version)
    REFERENCES public.hub_gap_rules (template_id, version)
);
CREATE INDEX idx_obligations_org_id ON public.obligations (org_id);

-- -----------------------------------------------------------------------------
-- 6. tasks  (actionable work items; distinct from dpo_queue)
--    access_link_id deferred: the access_links primitive does not exist yet.
-- -----------------------------------------------------------------------------

CREATE TABLE public.tasks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  obligation_id        uuid REFERENCES public.obligations(id) ON DELETE CASCADE,
  control_id           uuid REFERENCES public.controls(id) ON DELETE CASCADE,
  assignee_actor       text NOT NULL CHECK (assignee_actor IN ('dpo', 'owner', 'sysadmin', 'vendor')),
  assignee_contact_id  uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  title                text NOT NULL,
  status               text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  due_at               timestamptz,
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_org_id ON public.tasks (org_id);

-- -----------------------------------------------------------------------------
-- 7. evidence  (proof fulfilling an obligation: obligation <- fulfilled-by <- evidence)
-- -----------------------------------------------------------------------------

CREATE TABLE public.evidence (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  obligation_id  uuid NOT NULL REFERENCES public.obligations(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('document', 'answer', 'attestation', 'external_file')),
  document_id    uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  answer_ref     text,
  captured_at    timestamptz NOT NULL DEFAULT now(),
  captured_via   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_evidence_org_id ON public.evidence (org_id);
CREATE INDEX idx_evidence_obligation_id ON public.evidence (obligation_id);

-- -----------------------------------------------------------------------------
-- 8. events  (per-org append-only timeline; polymorphic entity, no FK)
--    Append-only: no updated_at. Composite index for per-entity timeline reads.
-- -----------------------------------------------------------------------------

CREATE TABLE public.events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type  text NOT NULL CHECK (entity_type IN ('obligation', 'control', 'task', 'evidence', 'asset')),
  entity_id    uuid NOT NULL,
  event_type   text NOT NULL,
  actor        text,
  data         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_org_id ON public.events (org_id);
CREATE INDEX idx_events_entity ON public.events (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY + GRANTS
--    Org-scoped via current_user_org_id() (STABLE SECURITY DEFINER helper).
--    Explicit anon / PUBLIC revoke so no broad anon grant is inherited.
--    service_role bypasses RLS (no service_role policy needed).
--    Final least-privilege state per role on the 7 tables:
--      anon          -> nothing
--      authenticated -> SELECT/INSERT/UPDATE/DELETE on the 6 (RLS org-scoped),
--                       SELECT/INSERT only on events (append-only), no TRUNCATE
--      service_role  -> ALL (bypasses RLS)
-- -----------------------------------------------------------------------------

ALTER TABLE public.assets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events      ENABLE ROW LEVEL SECURITY;

-- Org-scoped read/write for authenticated org members (6 standard ledger tables).
CREATE POLICY assets_org_scope      ON public.assets      FOR ALL TO authenticated USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id());
CREATE POLICY contacts_org_scope    ON public.contacts    FOR ALL TO authenticated USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id());
CREATE POLICY controls_org_scope    ON public.controls    FOR ALL TO authenticated USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id());
CREATE POLICY obligations_org_scope ON public.obligations FOR ALL TO authenticated USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id());
CREATE POLICY tasks_org_scope       ON public.tasks       FOR ALL TO authenticated USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id());
CREATE POLICY evidence_org_scope    ON public.evidence    FOR ALL TO authenticated USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id());

-- events is append-only for authenticated: SELECT + INSERT only, no UPDATE / DELETE policy.
CREATE POLICY events_org_select ON public.events FOR SELECT TO authenticated USING (org_id = current_user_org_id());
CREATE POLICY events_org_insert ON public.events FOR INSERT TO authenticated WITH CHECK (org_id = current_user_org_id());

-- Grants: no anon DML on any ledger table. authenticated is gated by RLS above;
-- service_role gets full access and bypasses RLS.
REVOKE ALL ON public.assets, public.contacts, public.controls, public.obligations, public.tasks, public.evidence, public.events FROM PUBLIC;
REVOKE ALL ON public.assets, public.contacts, public.controls, public.obligations, public.tasks, public.evidence, public.events FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets, public.contacts, public.controls, public.obligations, public.tasks, public.evidence TO authenticated;
GRANT SELECT, INSERT ON public.events TO authenticated;  -- append-only

GRANT ALL ON public.assets, public.contacts, public.controls, public.obligations, public.tasks, public.evidence, public.events TO service_role;

-- Least-privilege hardening. Supabase default privileges grant ALL to
-- authenticated on new public tables; the GRANTs above are additive and do not
-- shrink that. Tighten explicitly so the final authenticated grant is minimal:
--   - events is append-only: authenticated keeps SELECT + INSERT only.
--   - no app role needs TRUNCATE (PostgREST never issues it; it bypasses RLS).
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.events FROM authenticated;
REVOKE TRUNCATE ON public.assets, public.contacts, public.controls, public.obligations, public.tasks, public.evidence, public.events FROM authenticated;

-- -----------------------------------------------------------------------------
-- 10. updated_at triggers: NONE (verified against the live DB).
--     A live pg_trigger check found updated_at triggers on only 5 of 58 tables
--     (calculator_leads, data_subject_requests, database_scenarios,
--     message_threads) and on NONE of the close analogs: data_recipients,
--     dpo_queue, and the entire hub_* set from migration 022. So an updated_at
--     trigger is not the prevailing convention; columns-only matches the most
--     analogous tables. updated_at is set by the app / service layer on write.
-- -----------------------------------------------------------------------------

COMMIT;
