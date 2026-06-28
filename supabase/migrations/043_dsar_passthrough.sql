-- =============================================================================
-- 043_dsar_passthrough.sql
--
-- E4: DSAR (בקשת עיון) as TRUE pass-through. A data subject opens a no-login
-- tokenized link, submits their request; the subject's PII (name / ת"ז / email /
-- phone / details) is routed to the org's DPO OUT-OF-BAND (Resend, in the server
-- route) and is NEVER persisted in Postgres. The only thing the DB keeps is a
-- PII-FREE tracking row (proves a request happened + the 30-day clock).
-- ADDITIVE / forward only, idempotent (re-runnable). Behind the DSAR_PASSTHROUGH
-- per-org flag (organizations.feature_flags) - legacy /rights stays the default.
--
-- THE PII-ROUTING CRUX (why this is safe):
--   * The dsar submission does NOT call submit_access_link (which writes
--     events+evidence). It calls dsar_record(p_token, p_request_type) - a fn
--     whose SIGNATURE HAS NO PII SLOT. PII cannot reach the DB through it.
--   * dsar_record + dsar_resolve are owned by a dedicated NOLOGIN role `dsar_fn`
--     granted ONLY: SELECT/UPDATE(status,used_at) on access_links, INSERT/SELECT
--     on dsar_requests. It has ZERO grant on events / evidence / obligations /
--     data_recipients / controls / contacts / organizations.
--   * dsar_requests has no column able to hold name/ת"ז/email/phone/details.
--   * submit_access_link gets a dsar early-reject guard (defense in depth).
--   * The org's DPO notify email is denormalized onto the access_links row at
--     mint (resolved once, by the authed DPO under RLS) so the public submit path
--     reads no contacts/organizations PII.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. The dedicated minimal-grant role that owns the dsar functions.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dsar_fn') THEN
    CREATE ROLE dsar_fn NOLOGIN NOINHERIT;
  END IF;
END
$$;

GRANT dsar_fn TO postgres;
GRANT USAGE, CREATE ON SCHEMA public TO dsar_fn;
GRANT USAGE ON SCHEMA extensions TO dsar_fn;
GRANT EXECUTE ON FUNCTION extensions.digest(text, text) TO dsar_fn;

-- -----------------------------------------------------------------------------
-- 2. access_links: the DPO notify email (denormalized at mint, NOT subject PII)
--    + relax the NOT NULLs so a dsar token row can exist with no obligation/task/
--    question-set, behind a CHECK that preserves the E1/E2/E3 invariant.
-- -----------------------------------------------------------------------------
ALTER TABLE public.access_links ADD COLUMN IF NOT EXISTS dpo_notify_email text;

ALTER TABLE public.access_links ALTER COLUMN obligation_id       DROP NOT NULL;
ALTER TABLE public.access_links ALTER COLUMN task_id             DROP NOT NULL;
ALTER TABLE public.access_links ALTER COLUMN q_asset_template_id DROP NOT NULL;

ALTER TABLE public.access_links DROP CONSTRAINT IF EXISTS access_links_purpose_fields_check;
ALTER TABLE public.access_links ADD CONSTRAINT access_links_purpose_fields_check
  CHECK (
    purpose = 'dsar'
    OR (obligation_id IS NOT NULL AND task_id IS NOT NULL AND q_asset_template_id IS NOT NULL)
  );

-- access_links policies for the dsar_fn role (the TO access_link_fn/authenticated
-- policies do not cover it). The SELECT policy pairs with the column grant so the
-- UPDATE ... WHERE can locate the row (the E1 0-rows lesson).
DROP POLICY IF EXISTS access_links_dsar_select ON public.access_links;
CREATE POLICY access_links_dsar_select ON public.access_links
  FOR SELECT TO dsar_fn USING (true);

DROP POLICY IF EXISTS access_links_dsar_update ON public.access_links;
CREATE POLICY access_links_dsar_update ON public.access_links
  FOR UPDATE TO dsar_fn USING (true) WITH CHECK (true);

GRANT SELECT ON public.access_links TO dsar_fn;
GRANT UPDATE (status, used_at) ON public.access_links TO dsar_fn;

-- -----------------------------------------------------------------------------
-- 3. dsar_requests: the PII-FREE tracking row (system-of-record + 30-day clock).
--    There is intentionally NO column that can hold name / ת"ז / email / phone /
--    details / response text.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dsar_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  access_link_id     uuid REFERENCES public.access_links(id) ON DELETE SET NULL,
  request_type       text NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'objection')),
  status             text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_progress', 'completed', 'rejected')),
  correlation_ref    text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  deadline           timestamptz NOT NULL,                 -- = created_at + 30 days (set by dsar_record)
  responded_at       timestamptz,
  status_changed_at  timestamptz,
  identity_verified  boolean NOT NULL DEFAULT false,       -- the bool only; NEVER the ת"ז itself
  verified_at        timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS dsar_requests_correlation_ref_key ON public.dsar_requests (correlation_ref);
CREATE INDEX IF NOT EXISTS dsar_requests_org_id_idx ON public.dsar_requests (org_id);

ALTER TABLE public.dsar_requests ENABLE ROW LEVEL SECURITY;

-- DPO (authenticated) reads + manages own-org requests (inbox + mark verified/responded).
DROP POLICY IF EXISTS dsar_requests_org_select ON public.dsar_requests;
CREATE POLICY dsar_requests_org_select ON public.dsar_requests
  FOR SELECT TO authenticated USING (org_id = current_user_org_id());

DROP POLICY IF EXISTS dsar_requests_org_update ON public.dsar_requests;
CREATE POLICY dsar_requests_org_update ON public.dsar_requests
  FOR UPDATE TO authenticated USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id());

-- The fn role inserts (the request) + reads (idempotency lookup) only.
DROP POLICY IF EXISTS dsar_requests_fn_insert ON public.dsar_requests;
CREATE POLICY dsar_requests_fn_insert ON public.dsar_requests
  FOR INSERT TO dsar_fn WITH CHECK (true);

DROP POLICY IF EXISTS dsar_requests_fn_select ON public.dsar_requests;
CREATE POLICY dsar_requests_fn_select ON public.dsar_requests
  FOR SELECT TO dsar_fn USING (true);

-- Lock down anon (the latent default-grant gotcha); keep authenticated/service_role.
REVOKE ALL ON public.dsar_requests FROM anon, PUBLIC;
REVOKE TRUNCATE, REFERENCES, TRIGGER, DELETE, INSERT ON public.dsar_requests FROM authenticated;
GRANT SELECT, UPDATE ON public.dsar_requests TO authenticated;
GRANT INSERT, SELECT ON public.dsar_requests TO dsar_fn;
GRANT ALL ON public.dsar_requests TO service_role;

-- -----------------------------------------------------------------------------
-- 4. mint_access_link: add a dsar branch (no task/obligation/recipient; resolve
--    the org's DPO notify email and store it). Same 6-arg signature; non-dsar
--    behaviour byte-identical. Drop+recreate (re-grant EXECUTE after).
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mint_access_link(text, uuid, text, uuid, timestamptz, uuid);

CREATE FUNCTION public.mint_access_link(
  p_purpose             text,
  p_task_id             uuid,
  p_org_display_name    text,
  p_q_asset_template_id uuid,
  p_expires_at          timestamptz,
  p_target_recipient_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_org       uuid := public.current_user_org_id();
  v_oblig     uuid;
  v_token     text;
  v_hash      text;
  v_creator   uuid;
  v_dpo_email text;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no org context';
  END IF;
  IF p_purpose NOT IN ('sysadmin_questionnaire', 'vendor_dpa', 'dsar') THEN
    RAISE EXCEPTION 'invalid purpose';
  END IF;

  v_token   := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash    := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_creator := (SELECT id FROM public.users WHERE auth_user_id = auth.uid());

  IF p_purpose = 'dsar' THEN
    -- DSAR links are not obligation/task/recipient bound and carry no question set.
    -- Resolve the org's DPO notify email once, under the caller's own RLS, and
    -- denormalize it so the public submit path never reads contacts/organizations.
    v_dpo_email := (SELECT email FROM public.contacts
                    WHERE org_id = v_org AND role = 'dpo' AND email IS NOT NULL
                    ORDER BY created_at LIMIT 1);
    IF v_dpo_email IS NULL THEN
      v_dpo_email := (SELECT contact_email FROM public.organizations WHERE id = v_org);
    END IF;
    IF v_dpo_email IS NULL THEN
      v_dpo_email := (SELECT email FROM public.users
                      WHERE org_id = v_org AND role = 'admin' AND email IS NOT NULL LIMIT 1);
    END IF;

    INSERT INTO public.access_links
      (org_id, token_hash, purpose, org_display_name, status, expires_at, created_by, dpo_notify_email)
    VALUES
      (v_org, v_hash, 'dsar', p_org_display_name, 'active', p_expires_at, v_creator, v_dpo_email);

    RETURN v_token;
  END IF;

  -- non-dsar (sysadmin_questionnaire / vendor_dpa): obligation-linked task required.
  SELECT obligation_id INTO v_oblig FROM public.tasks WHERE id = p_task_id AND org_id = v_org;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'task not found in caller org';
  END IF;
  IF v_oblig IS NULL THEN
    RAISE EXCEPTION 'task is not obligation-linked; evidence requires an obligation';
  END IF;

  IF p_target_recipient_id IS NOT NULL THEN
    PERFORM 1 FROM public.data_recipients WHERE id = p_target_recipient_id AND org_id = v_org;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'recipient not found in caller org';
    END IF;
  END IF;

  INSERT INTO public.access_links
    (org_id, token_hash, purpose, task_id, obligation_id, org_display_name,
     q_asset_template_id, status, expires_at, created_by, target_recipient_id)
  VALUES
    (v_org, v_hash, p_purpose, p_task_id, v_oblig, p_org_display_name,
     p_q_asset_template_id, 'active', p_expires_at, v_creator, p_target_recipient_id);

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.mint_access_link(text, uuid, text, uuid, timestamptz, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mint_access_link(text, uuid, text, uuid, timestamptz, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. submit_access_link: dsar early-reject guard (defense in depth). A dsar token
--    POSTed here writes NOTHING - dsar must use the dedicated pass-through path.
--    Non-dsar behaviour byte-identical.
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
  v_arr      jsonb;
  v_has_dpa  boolean;
  v_signed   date;
  v_expiry   date;
  v_next_due timestamptz;
BEGIN
  IF p_token IS NULL OR length(p_token) = 0 THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link FROM public.access_links WHERE token_hash = v_hash FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  -- DSAR pass-through must NEVER flow through this evidence/events writer (the
  -- subject's answers are PII). Reject here; dsar uses dsar_record.
  IF v_link.purpose = 'dsar' THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  -- Idempotent: already submitted -> same success, no duplicate writes.
  IF v_link.status = 'used' THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_link.status <> 'active' OR v_link.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_kind := CASE WHEN v_link.purpose = 'vendor_dpa' THEN 'attestation' ELSE 'answer' END;

  v_event_id := gen_random_uuid();
  INSERT INTO public.events (id, org_id, entity_type, entity_id, event_type, actor, data)
  VALUES (
    v_event_id, v_link.org_id, 'task', v_link.task_id, 'access_link_submitted',
    'external:' || v_link.purpose,
    jsonb_build_object('access_link_id', v_link.id, 'purpose', v_link.purpose, 'answers', coalesce(p_answers, '{}'::jsonb))
  );

  INSERT INTO public.evidence (org_id, obligation_id, kind, answer_ref, captured_via)
  VALUES (v_link.org_id, v_link.obligation_id, v_kind, v_event_id::text, 'access_link');

  IF v_link.purpose = 'vendor_dpa' AND v_link.target_recipient_id IS NOT NULL THEN
    v_arr := CASE WHEN jsonb_typeof(coalesce(p_answers, '[]'::jsonb)) = 'array' THEN p_answers ELSE '[]'::jsonb END;

    v_has_dpa := coalesce(
      (SELECT (e->>'a') = 'כן' FROM jsonb_array_elements(v_arr) e WHERE e->>'k' = 'dpa_has' LIMIT 1),
      false);
    v_signed := (SELECT CASE WHEN (e->>'a') ~ '^\d{4}-\d{2}-\d{2}$' THEN (e->>'a')::date ELSE NULL END
                 FROM jsonb_array_elements(v_arr) e WHERE e->>'k' = 'dpa_signed_date' LIMIT 1);
    v_expiry := (SELECT CASE WHEN (e->>'a') ~ '^\d{4}-\d{2}-\d{2}$' THEN (e->>'a')::date ELSE NULL END
                 FROM jsonb_array_elements(v_arr) e WHERE e->>'k' = 'dpa_expiry_date' LIMIT 1);
    v_expiry := coalesce(v_expiry, (v_signed + interval '1 year')::date);

    UPDATE public.data_recipients
    SET has_dpa = v_has_dpa,
        dpa_signed_date = v_signed,
        dpa_expiry_date = v_expiry,
        updated_at = now()
    WHERE id = v_link.target_recipient_id AND org_id = v_link.org_id;

    v_next_due := coalesce(v_expiry::timestamptz, now() + interval '1 year');
    INSERT INTO public.controls
      (org_id, source_playbook_id, source_playbook_version, cadence, owner_role, next_due_at, last_completed_at, status)
    VALUES
      (v_link.org_id, 'c1000003-0000-4000-8000-000000000003', 1, 'annual', 'dpo', v_next_due, now(), 'active')
    ON CONFLICT (org_id, source_playbook_id, source_playbook_version)
    DO UPDATE SET next_due_at = EXCLUDED.next_due_at, last_completed_at = now(), status = 'active', updated_at = now();
  END IF;

  UPDATE public.tasks
  SET status = 'done', completed_at = now(), updated_at = now()
  WHERE id = v_link.task_id;

  UPDATE public.access_links
  SET status = 'used', used_at = now()
  WHERE id = v_link.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. dsar_resolve (public, anon-callable). Read-only. Returns ONLY the generic
--    org display name + the DPO notify email (for the server route to send to).
--    Uniform { valid:false } for unknown/non-dsar/expired/revoked/used. No PII.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dsar_resolve(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_link public.access_links%ROWTYPE;
  v_hash text;
BEGIN
  IF p_token IS NULL OR length(p_token) = 0 THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  SELECT * INTO v_link FROM public.access_links WHERE token_hash = v_hash;

  IF NOT FOUND OR v_link.purpose <> 'dsar' OR v_link.status <> 'active' OR v_link.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'org_display_name', v_link.org_display_name,
    'dpo_notify_email', v_link.dpo_notify_email
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. dsar_record (public, anon-callable). The ONLY DB write of the dsar submit.
--    NO PII SLOT in the signature. Creates the PII-free tracking row + burns the
--    link. Idempotent: a used link returns its existing correlation_ref, no new
--    write. Touches ONLY dsar_requests + access_links - never events/evidence.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dsar_record(p_token text, p_request_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_link public.access_links%ROWTYPE;
  v_hash text;
  v_now  timestamptz;
  v_ref  text;
BEGIN
  IF p_token IS NULL OR length(p_token) = 0 THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  IF p_request_type NOT IN ('access', 'rectification', 'erasure', 'objection') THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  SELECT * INTO v_link FROM public.access_links WHERE token_hash = v_hash FOR UPDATE;

  IF NOT FOUND OR v_link.purpose <> 'dsar' THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  -- Idempotent: already submitted -> return the same correlation_ref, no new row.
  IF v_link.status = 'used' THEN
    RETURN jsonb_build_object('ok', true,
      'correlation_ref', (SELECT correlation_ref FROM public.dsar_requests WHERE access_link_id = v_link.id LIMIT 1));
  END IF;

  IF v_link.status <> 'active' OR v_link.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  v_now := now();
  v_ref := 'DSR-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));

  INSERT INTO public.dsar_requests
    (org_id, access_link_id, request_type, status, correlation_ref, created_at, deadline, status_changed_at)
  VALUES
    (v_link.org_id, v_link.id, p_request_type, 'received', v_ref, v_now, v_now + interval '30 days', v_now);

  UPDATE public.access_links SET status = 'used', used_at = now() WHERE id = v_link.id;

  RETURN jsonb_build_object('ok', true, 'correlation_ref', v_ref);
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. Ownership (the minimal firewall role) + EXECUTE grants (anon + authenticated;
--    revoked from PUBLIC).
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.dsar_resolve(text) OWNER TO dsar_fn;
ALTER FUNCTION public.dsar_record(text, text) OWNER TO dsar_fn;

REVOKE ALL ON FUNCTION public.dsar_resolve(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dsar_record(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dsar_resolve(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dsar_record(text, text) TO anon, authenticated;

COMMIT;
