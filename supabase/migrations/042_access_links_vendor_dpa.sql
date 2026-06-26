-- =============================================================================
-- 042_access_links_vendor_dpa.sql
--
-- E3: the vendor DPA chase purpose, built on the E1 access_links primitive. A
-- vendor opens a no-login link, attests DPA status, submits; the submission
-- writes back to the vendor record (data_recipients) and arms the annual
-- re-chase (a control), in addition to E1's evidence + events + task-done.
-- ADDITIVE / forward only, and idempotent (re-runnable).
--
-- WHAT CHANGES vs E1 (041):
--   * access_links gains target_recipient_id (which vendor a vendor_dpa link is
--     for). NULL for every other purpose - E2's sysadmin links are unaffected.
--   * mint_access_link gains p_target_recipient_id (DEFAULT NULL, so E2's 5-arg
--     calls still resolve) + an org-ownership check on the recipient.
--   * submit_access_link KEEPS its 2-arg signature; its body gains a
--     purpose='vendor_dpa' branch that updates data_recipients + arms the
--     control. The sysadmin/answer path is byte-identical.
--   * access_link_fn (the firewall role) gains COLUMN-SCOPED access:
--       data_recipients: SELECT(id,org_id) + UPDATE(has_dpa, dpa_signed_date,
--         dpa_expiry_date, updated_at) - NEVER compliance_verified or status.
--       controls: INSERT + UPDATE(next_due_at,last_completed_at,status,updated_at).
--     It still has NO grant on organizations / contacts / obligations.
--
-- TRUST BOUNDARY (unchanged): the vendor self-attests (has_dpa + dates, captured
-- as evidence too); compliance_verified stays DPO-only; obligation_status is NOT
-- touched. The DPO judges compliance.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. access_links: which vendor a vendor_dpa link targets (NULL otherwise).
-- -----------------------------------------------------------------------------
ALTER TABLE public.access_links
  ADD COLUMN IF NOT EXISTS target_recipient_id uuid REFERENCES public.data_recipients(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 2. access_link_fn firewall: narrow, column-scoped access to the write-back
--    targets. NO compliance_verified / status on data_recipients; no new SELECT
--    on organizations / contacts / obligations.
-- -----------------------------------------------------------------------------
GRANT SELECT (id, org_id) ON public.data_recipients TO access_link_fn;
GRANT UPDATE (has_dpa, dpa_signed_date, dpa_expiry_date, updated_at) ON public.data_recipients TO access_link_fn;
GRANT INSERT ON public.controls TO access_link_fn;
GRANT UPDATE (next_due_at, last_completed_at, status, updated_at) ON public.controls TO access_link_fn;
-- INSERT ... ON CONFLICT DO UPDATE requires table-level SELECT on controls (to
-- detect the conflicting row). controls is per-org operational data (playbook +
-- cadence + dates), not PII; it is never returned to the public path (submit
-- returns only {ok}), so this does not weaken the CC-2 firewall - the role still
-- has no access to organizations / contacts / obligations.
GRANT SELECT ON public.controls TO access_link_fn;

-- Matching RLS policies for the fn role (the legacy auth.uid() policy on
-- data_recipients and the TO authenticated policy on controls do not cover a
-- no-session role). WITH CHECK (true) is safe: the function body scopes org_id,
-- and the GRANTs above bound which columns/tables it can touch at all. The
-- SELECT policy on data_recipients is required so the UPDATE ... WHERE can
-- locate the row (the E1 0-rows lesson); column grant still limits it to id/org_id.
DROP POLICY IF EXISTS data_recipients_fn_select ON public.data_recipients;
CREATE POLICY data_recipients_fn_select ON public.data_recipients
  FOR SELECT TO access_link_fn USING (true);

DROP POLICY IF EXISTS data_recipients_fn_update ON public.data_recipients;
CREATE POLICY data_recipients_fn_update ON public.data_recipients
  FOR UPDATE TO access_link_fn USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS controls_fn_select ON public.controls;
CREATE POLICY controls_fn_select ON public.controls
  FOR SELECT TO access_link_fn USING (true);

DROP POLICY IF EXISTS controls_fn_insert ON public.controls;
CREATE POLICY controls_fn_insert ON public.controls
  FOR INSERT TO access_link_fn WITH CHECK (true);

DROP POLICY IF EXISTS controls_fn_update ON public.controls;
CREATE POLICY controls_fn_update ON public.controls
  FOR UPDATE TO access_link_fn USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. mint_access_link: add p_target_recipient_id (DEFAULT NULL for back-compat)
--    + org-ownership check. Drop the old 5-arg signature, recreate as 6-arg so
--    callers passing 5 args resolve to the default.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mint_access_link(text, uuid, text, uuid, timestamptz);
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

  -- RLS-scoped read: the task must be in the caller's org and obligation-linked.
  SELECT obligation_id INTO v_oblig FROM public.tasks WHERE id = p_task_id AND org_id = v_org;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'task not found in caller org';
  END IF;
  IF v_oblig IS NULL THEN
    RAISE EXCEPTION 'task is not obligation-linked; evidence requires an obligation';
  END IF;

  -- Org-ownership check on the recipient (SECURITY INVOKER -> the SELECT runs
  -- under the caller's RLS, so a cross-org recipient simply is not found).
  IF p_target_recipient_id IS NOT NULL THEN
    PERFORM 1 FROM public.data_recipients WHERE id = p_target_recipient_id AND org_id = v_org;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'recipient not found in caller org';
    END IF;
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash  := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.access_links
    (org_id, token_hash, purpose, task_id, obligation_id, org_display_name,
     q_asset_template_id, status, expires_at, created_by, target_recipient_id)
  VALUES
    (v_org, v_hash, p_purpose, p_task_id, v_oblig, p_org_display_name,
     p_q_asset_template_id, 'active', p_expires_at,
     (SELECT id FROM public.users WHERE auth_user_id = auth.uid()), p_target_recipient_id);

  RETURN v_token;  -- raw token, returned ONCE
END;
$$;

-- mint is owned by postgres (SECURITY INVOKER). Re-apply the 041 EXECUTE policy:
-- DPO-only (Supabase default-privileges re-grant anon on a freshly created fn).
REVOKE ALL ON FUNCTION public.mint_access_link(text, uuid, text, uuid, timestamptz, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mint_access_link(text, uuid, text, uuid, timestamptz, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. submit_access_link: same 2-arg signature (CREATE OR REPLACE keeps the
--    access_link_fn owner + EXECUTE grants). Body gains the vendor_dpa write-back.
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

  -- Idempotent: already submitted -> same success, no duplicate writes (and no
  -- double-arm of the control, since this returns before the write-back).
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

  -- 2b. vendor_dpa write-back: update the vendor record + arm the annual re-chase.
  --     Typed values are extracted from the self-describing answers by their 'k'
  --     semantic key; dates are regex-validated (a malformed date stores NULL,
  --     never a bad value). compliance_verified / status are NOT touched.
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

    -- arm the annual vendor-DPA re-chase (idempotent upsert of the playbook control)
    v_next_due := coalesce(v_expiry::timestamptz, now() + interval '1 year');
    INSERT INTO public.controls
      (org_id, source_playbook_id, source_playbook_version, cadence, owner_role, next_due_at, last_completed_at, status)
    VALUES
      (v_link.org_id, 'c1000003-0000-4000-8000-000000000003', 1, 'annual', 'dpo', v_next_due, now(), 'active')
    ON CONFLICT (org_id, source_playbook_id, source_playbook_version)
    DO UPDATE SET next_due_at = EXCLUDED.next_due_at, last_completed_at = now(), status = 'active', updated_at = now();
  END IF;

  -- 3. Mark the scoped task done - the external party's work item is complete.
  --    obligation_status is untouched (the DPO judges separately).
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

COMMIT;
