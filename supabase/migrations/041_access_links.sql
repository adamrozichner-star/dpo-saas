-- =============================================================================
-- 041_access_links.sql
--
-- E1: the access_links primitive. A tokenized, no-login link that lets one
-- external party (sysadmin / vendor / subject) open exactly ONE scoped task,
-- see ONLY a generic org display name + the question set, submit, and have the
-- result captured as evidence + events on the ledger. Zero exposure of any
-- other org data (CC-2). ADDITIVE / forward only.
--
-- SECURITY MODEL (the heart of E1):
--   * anon has ZERO direct grant on access_links. Its ONLY capability is
--     EXECUTE on two SECURITY DEFINER functions (resolve_access_link,
--     submit_access_link).
--   * Those two functions are owned by a dedicated, NOLOGIN, minimal-grant role
--     `access_link_fn` (the regulatory_ingest_worker pattern). The role's table
--     privileges are the hard firewall: it can SELECT only access_links +
--     hub_questions, INSERT evidence + events, UPDATE access_links + tasks. It
--     has NO grant on organizations / contacts / obligations, so even a logic
--     bug in a function body cannot leak them. This is what makes the CC-2
--     containment provable at the grant layer, not just by behavior.
--   * No service-role key anywhere on the public path.
--   * Tokens are crypto-random (256-bit) and stored hashed (sha256). The raw
--     token is returned once at mint and never persisted, so a DB read/dump
--     yields no usable token.
--   * obligation_id is denormalized onto the link at mint (validated to be
--     non-null) so the public functions never need to read tasks/obligations to
--     satisfy evidence.obligation_id (NOT NULL).
--   * SUBMISSION DOES NOT ADVANCE obligation_status. An external party submits
--     evidence; the DPO judges compliance (the C3 queue/resolve path). This is a
--     deliberate trust boundary.
--
-- The DPO side is RLS-scoped/authenticated: mint_access_link (SECURITY INVOKER,
-- runs as the caller under RLS) and revoke (a plain status UPDATE under the
-- authenticated RLS policy). The full DPO management UI is E2.
--
-- pgcrypto (digest, gen_random_bytes) lives in the `extensions` schema here, so
-- every call is schema-qualified.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. The dedicated minimal-grant role that owns the public functions.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'access_link_fn') THEN
    CREATE ROLE access_link_fn NOLOGIN NOINHERIT;
  END IF;
END
$$;

-- postgres must be a member of the role to assign function ownership to it.
GRANT access_link_fn TO postgres;
-- CREATE (not just USAGE) on public is required to OWN a function in that schema
-- (same as the regulatory_ingest_worker precedent). It does not widen the CC-2
-- surface: the role is NOLOGIN, only ever assumed inside the two function
-- bodies (which issue no DDL), and still has no grant on organizations /
-- contacts / obligations.
GRANT USAGE, CREATE ON SCHEMA public TO access_link_fn;
GRANT USAGE ON SCHEMA extensions TO access_link_fn;
GRANT EXECUTE ON FUNCTION extensions.digest(text, text) TO access_link_fn;

-- -----------------------------------------------------------------------------
-- 2. The table.
-- -----------------------------------------------------------------------------
CREATE TABLE public.access_links (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token_hash           text NOT NULL,                 -- sha256(raw); raw is NEVER stored
  purpose              text NOT NULL CHECK (purpose IN ('sysadmin_questionnaire', 'vendor_dpa', 'dsar')),
  task_id              uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  obligation_id        uuid NOT NULL REFERENCES public.obligations(id) ON DELETE CASCADE,  -- denormalized from the task
  org_display_name     text NOT NULL,                 -- denormalized; the public path never reads organizations
  q_asset_template_id  uuid NOT NULL,                 -- the hub_questions set to show (grouped by asset_template_id)
  status               text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  expires_at           timestamptz NOT NULL,
  created_by           uuid REFERENCES public.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  used_at              timestamptz
);

CREATE UNIQUE INDEX access_links_token_hash_key ON public.access_links (token_hash);
CREATE INDEX access_links_org_id_idx ON public.access_links (org_id);

-- -----------------------------------------------------------------------------
-- 3. events.entity_type CHECK: add 'access_link' so a link's own lifecycle is
--    auditable on the ledger. (The submission event uses entity_type 'task'.)
-- -----------------------------------------------------------------------------
ALTER TABLE public.events DROP CONSTRAINT events_entity_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_entity_type_check
  CHECK (entity_type = ANY (ARRAY['obligation', 'control', 'task', 'evidence', 'asset', 'dpo_queue', 'access_link']));

-- -----------------------------------------------------------------------------
-- 4. RLS + grants on access_links.
--    DPO (authenticated) is org-scoped via current_user_org_id() (mint/list/
--    revoke). The fn role gets narrow non-session policies because it acts for
--    whatever org the resolved token belongs to (no session to scope to); its
--    org-scoping is enforced in the function bodies, and its blast radius is
--    bounded by the column/table GRANTs below.
-- -----------------------------------------------------------------------------
ALTER TABLE public.access_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_links_org_scope ON public.access_links
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

CREATE POLICY access_links_fn_select ON public.access_links
  FOR SELECT TO access_link_fn USING (true);

CREATE POLICY access_links_fn_update ON public.access_links
  FOR UPDATE TO access_link_fn USING (true) WITH CHECK (true);

-- Lock down anon (the hub_* latent-grant gotcha) and keep the authenticated/
-- service_role defaults that Supabase grants on new public tables.
REVOKE ALL ON public.access_links FROM anon, PUBLIC;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.access_links FROM authenticated;
GRANT ALL ON public.access_links TO service_role;

-- The fn role's hard firewall on access_links: read it, and burn it. Nothing else.
GRANT SELECT ON public.access_links TO access_link_fn;
GRANT UPDATE (status, used_at) ON public.access_links TO access_link_fn;

-- -----------------------------------------------------------------------------
-- 5. The fn role's narrow access to the write targets + the question catalog.
--    INSERT-only on evidence/events; UPDATE only the task lifecycle columns;
--    SELECT only the task id it already holds. NO access to organizations /
--    contacts / obligations.
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.hub_questions TO access_link_fn;
GRANT INSERT ON public.evidence TO access_link_fn;
GRANT INSERT ON public.events TO access_link_fn;
GRANT SELECT (id) ON public.tasks TO access_link_fn;
GRANT UPDATE (status, completed_at, updated_at) ON public.tasks TO access_link_fn;

-- Matching RLS policies for the fn role (the TO authenticated policies from 037
-- do not cover it). WITH CHECK (true) is safe: the function bodies constrain
-- org_id, and the GRANTs above bound what columns/tables it can touch at all.
CREATE POLICY hub_questions_fn_select ON public.hub_questions
  FOR SELECT TO access_link_fn USING (true);

CREATE POLICY evidence_fn_insert ON public.evidence
  FOR INSERT TO access_link_fn WITH CHECK (true);

CREATE POLICY events_fn_insert ON public.events
  FOR INSERT TO access_link_fn WITH CHECK (true);

-- The fn role needs a SELECT policy (paired with the SELECT (id) grant) so the
-- task UPDATE can locate the row by id - without it RLS makes the UPDATE match
-- zero rows. The column grant still limits readable columns to id alone.
CREATE POLICY tasks_fn_select ON public.tasks
  FOR SELECT TO access_link_fn USING (true);

CREATE POLICY tasks_fn_update ON public.tasks
  FOR UPDATE TO access_link_fn USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 6. resolve_access_link (public, anon-callable). Returns ONLY a generic org
--    display name + purpose + the question set. Unknown / tampered / expired /
--    revoked / used tokens all return a uniform { valid: false } - no existence
--    distinction, no leak. The allowlist IS the jsonb_build_object below.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_access_link(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_link     public.access_links%ROWTYPE;
  v_hash     text;
  v_questions jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) = 0 THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link FROM public.access_links WHERE token_hash = v_hash;

  IF NOT FOUND OR v_link.status <> 'active' OR v_link.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT coalesce(jsonb_agg(obj ORDER BY ord), '[]'::jsonb) INTO v_questions
  FROM (
    SELECT order_index AS ord,
           jsonb_build_object(
             'id', id,
             'order_index', order_index,
             'question_text', question_text,
             'question_type', question_type,
             'choices', choices,
             'required', required,
             'help_text', help_text,
             'depends_on', depends_on
           ) AS obj
    FROM public.hub_questions
    WHERE asset_template_id = v_link.q_asset_template_id
      AND active = true
  ) sub;

  RETURN jsonb_build_object(
    'valid', true,
    'org_display_name', v_link.org_display_name,
    'purpose', v_link.purpose,
    'questions', v_questions
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. submit_access_link (public, anon-callable). Captures evidence + events and
--    marks the task submitted, atomically, for the link's org only. Idempotent:
--    a 'used' link returns the same success with no new writes. Does NOT advance
--    obligation_status (DPO judges). Uniform { ok: false } on any invalid token.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_access_link(p_token text, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_link     public.access_links%ROWTYPE;
  v_hash     text;
  v_event_id uuid;
  v_kind     text;
BEGIN
  IF p_token IS NULL OR length(p_token) = 0 THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link FROM public.access_links WHERE token_hash = v_hash FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  -- Idempotent: already submitted -> same success, no duplicate writes.
  IF v_link.status = 'used' THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  -- Anything else not currently active (revoked / expired by status or by time).
  IF v_link.status <> 'active' OR v_link.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_kind := CASE WHEN v_link.purpose = 'vendor_dpa' THEN 'attestation' ELSE 'answer' END;

  -- 1. Append the submission event (holds the answer payload). The id is
  --    generated explicitly rather than via RETURNING so the fn role needs no
  --    SELECT on events (it stays INSERT-only there - tighter containment).
  v_event_id := gen_random_uuid();
  INSERT INTO public.events (id, org_id, entity_type, entity_id, event_type, actor, data)
  VALUES (
    v_event_id, v_link.org_id, 'task', v_link.task_id, 'access_link_submitted',
    'external:' || v_link.purpose,
    jsonb_build_object('access_link_id', v_link.id, 'purpose', v_link.purpose, 'answers', coalesce(p_answers, '{}'::jsonb))
  );

  -- 2. Capture evidence pointing at that event.
  INSERT INTO public.evidence (org_id, obligation_id, kind, answer_ref, captured_via)
  VALUES (v_link.org_id, v_link.obligation_id, v_kind, v_event_id::text, 'access_link');

  -- 3. Mark the scoped task done - the external party's work item is complete.
  --    This is NOT a compliance judgment: obligation_status is untouched (the
  --    DPO judges that separately). 'done' is the valid tasks.status value.
  UPDATE public.tasks
  SET status = 'done', completed_at = now(), updated_at = now()
  WHERE id = v_link.task_id;

  -- 4. Burn the link (single-submit; still viewable until expiry).
  UPDATE public.access_links
  SET status = 'used', used_at = now()
  WHERE id = v_link.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. mint_access_link (DPO, authenticated, SECURITY INVOKER -> RLS-scoped).
--    Generates the raw token, validates the task belongs to the caller's org
--    and is obligation-linked, inserts the link, and returns the raw token ONCE.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mint_access_link(
  p_purpose             text,
  p_task_id             uuid,
  p_org_display_name    text,
  p_q_asset_template_id uuid,
  p_expires_at          timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_org   uuid := public.current_user_org_id();
  v_oblig uuid;
  v_token text;
  v_hash  text;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no org context';
  END IF;
  IF p_purpose NOT IN ('sysadmin_questionnaire', 'vendor_dpa', 'dsar') THEN
    RAISE EXCEPTION 'invalid purpose';
  END IF;

  -- RLS-scoped read: the task must be in the caller's org and obligation-linked
  -- (evidence.obligation_id is NOT NULL).
  SELECT obligation_id INTO v_oblig FROM public.tasks WHERE id = p_task_id AND org_id = v_org;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'task not found in caller org';
  END IF;
  IF v_oblig IS NULL THEN
    RAISE EXCEPTION 'task is not obligation-linked; evidence requires an obligation';
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash  := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.access_links
    (org_id, token_hash, purpose, task_id, obligation_id, org_display_name,
     q_asset_template_id, status, expires_at, created_by)
  VALUES
    (v_org, v_hash, p_purpose, p_task_id, v_oblig, p_org_display_name,
     p_q_asset_template_id, 'active', p_expires_at,
     (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

  RETURN v_token;  -- raw token, returned ONCE
END;
$$;

-- -----------------------------------------------------------------------------
-- 9. Ownership + EXECUTE grants. The two public functions are owned by the
--    minimal-grant role (definer). EXECUTE is revoked from PUBLIC and granted
--    explicitly: resolve/submit to anon + authenticated; mint to authenticated.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.resolve_access_link(text) OWNER TO access_link_fn;
ALTER FUNCTION public.submit_access_link(text, jsonb) OWNER TO access_link_fn;

REVOKE ALL ON FUNCTION public.resolve_access_link(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_access_link(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mint_access_link(text, uuid, text, uuid, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.resolve_access_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_access_link(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mint_access_link(text, uuid, text, uuid, timestamptz) TO authenticated;

-- Supabase's ALTER DEFAULT PRIVILEGES grants EXECUTE on new public functions to
-- anon/authenticated/service_role explicitly (not via PUBLIC), so the REVOKE
-- FROM PUBLIC above does not remove anon. mint is a DPO-only action; revoke anon
-- explicitly. (resolve/submit intentionally stay anon-executable.)
REVOKE ALL ON FUNCTION public.mint_access_link(text, uuid, text, uuid, timestamptz) FROM anon;

COMMIT;
