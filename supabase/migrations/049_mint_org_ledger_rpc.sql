-- =============================================================================
-- 043_mint_org_ledger_rpc.sql
--
-- Path A onboarding->ledger mint. A narrow, fixed-statement SECURITY DEFINER RPC
-- that upserts ONE org's obligations + controls from structured JSONB the caller
-- (complete-onboarding, service_role) computes via the pure evaluator/planner.
-- It is NOT a general SQL executor: three parameterized statements over
-- jsonb_to_recordset, no dynamic SQL. Idempotency = the 038/039 partial unique
-- indexes; DO UPDATE sets mirror persist.ts / controls.ts (obligations preserve
-- status/opened_at/triggered_by; controls preserve next_due_at).
--
-- Grants: EXECUTE to service_role ONLY. Explicit REVOKE from PUBLIC/anon/
-- authenticated (functions default EXECUTE to PUBLIC). Regulatory GRANT-firewall
-- is NOT widened: this touches only obligations + controls (per-org client data),
-- reads nothing from hub_* (the route reads the catalog in TS and passes rows in).
-- SECURITY DEFINER hardened with a pinned search_path; owner postgres.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.mint_org_ledger(
  p_org_id      uuid,
  p_obligations jsonb,
  p_controls    jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_obl int := 0; v_ctl int := 0;
BEGIN
  -- 1. Obligations upsert -- mirrors buildObligationUpsertSql.
  --    On conflict refresh rule-denormalized fields ONLY; status/opened_at/triggered_by survive.
  INSERT INTO public.obligations
    (org_id, source_rule_id, source_version, title, description, severity, status, triggered_by)
  SELECT p_org_id, x.source_rule_id, x.source_version, x.title, x.description,
         x.severity, x.status::obligation_status, x.triggered_by
  FROM jsonb_to_recordset(p_obligations) AS x(
    source_rule_id uuid, source_version int, title text, description text,
    severity text, status text, triggered_by text)
  ON CONFLICT (org_id, source_rule_id) WHERE source_rule_id IS NOT NULL
  DO UPDATE SET source_version = EXCLUDED.source_version, title = EXCLUDED.title,
    description = EXCLUDED.description, severity = EXCLUDED.severity, updated_at = now();
  GET DIAGNOSTICS v_obl = ROW_COUNT;

  -- 2. Controls upsert -- mirrors buildControlUpsertSql. next_due_at PRESERVED on conflict.
  INSERT INTO public.controls
    (org_id, source_playbook_id, source_playbook_version, cadence, owner_role, next_due_at)
  SELECT p_org_id, c.source_playbook_id, c.source_playbook_version, c.cadence, c.owner_role, c.next_due_at
  FROM jsonb_to_recordset(p_controls) AS c(
    source_playbook_id uuid, source_playbook_version int, cadence text,
    owner_role text, next_due_at timestamptz, rule_template_ids jsonb)
  ON CONFLICT (org_id, source_playbook_id, source_playbook_version)
  DO UPDATE SET cadence = EXCLUDED.cadence, owner_role = EXCLUDED.owner_role, updated_at = now();
  GET DIAGNOSTICS v_ctl = ROW_COUNT;

  -- 3. Linkage -- mirrors buildObligationLinkSql. Point each obligation at its control + recurs_at.
  UPDATE public.obligations o
  SET fulfilled_by_control_id = ctl.id, recurs_at = ctl.next_due_at, updated_at = now()
  FROM (
    SELECT c.source_playbook_id, c.source_playbook_version,
           (jsonb_array_elements_text(c.rule_template_ids))::uuid AS rule_id
    FROM jsonb_to_recordset(p_controls) AS c(
      source_playbook_id uuid, source_playbook_version int, rule_template_ids jsonb)
  ) link
  JOIN public.controls ctl
    ON ctl.org_id = p_org_id
   AND ctl.source_playbook_id = link.source_playbook_id
   AND ctl.source_playbook_version = link.source_playbook_version
  WHERE o.org_id = p_org_id AND o.source_rule_id = link.rule_id;

  RETURN jsonb_build_object('obligations', v_obl, 'controls', v_ctl);
END;
$$;

ALTER FUNCTION public.mint_org_ledger(uuid, jsonb, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.mint_org_ledger(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mint_org_ledger(uuid, jsonb, jsonb) TO service_role;

COMMIT;
