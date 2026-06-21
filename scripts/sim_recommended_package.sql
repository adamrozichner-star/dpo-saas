-- =============================================================================
-- scripts/sim_recommended_package.sql
--
-- Simulates the "we recommend the Recommended package" state for the user
-- adamrozichner@gmail.com so the recommendation flow can be tested
-- end-to-end on the /subscribe page.
--
-- THROWAWAY TEST DATA. Dev/staging only. Do NOT run against production.
--
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
-- -----------------------------------------------------------------------------
-- 1. Looks up Adam by auth.users.email (no hardcoded UUIDs).
-- 2. Creates one test organization (idempotency marker:
--    business_id = 'TEST-ADAM-REC' — kept short because business_id
--    is varchar(20)) with tier='recommended', status='onboarding'.
-- 3. Links Adam's public.users.org_id to that org. Keeps his role as
--    expert_curator — he'll have both Hub-curator access and a
--    customer-org dashboard.
-- 4. Upserts organization_profiles.profile_data->'v3Answers' with values
--    that resolve to 'recommended' via the actual recommendation logic in
--    src/app/onboarding/page.tsx::calculateRecommendedTier:
--      industry='health'                          → first rule
--      databases includes 'medical' + 2 processors → second rule (overkill
--                                                   is intentional so the
--                                                   stored state is obviously
--                                                   justified by the algorithm)
-- 5. Deliberately does NOT create a subscription row. With no active
--    subscription + tier='recommended', /subscribe shows the recommendation
--    instead of redirecting to /dashboard.
--
-- -----------------------------------------------------------------------------
-- IDEMPOTENT + REVERSIBLE
-- -----------------------------------------------------------------------------
-- Re-running this file is safe: marker-based lookup finds the existing
-- test org and re-asserts its fields. No duplicates.
--
-- A complete -- ROLLBACK -- block lives at the bottom of this file. Uncomment
-- and re-run to revert exactly what this script created (org, profile, link).
--
-- -----------------------------------------------------------------------------
-- FIREWALL RESPECTED
-- -----------------------------------------------------------------------------
-- This script writes ONLY to:
--   - public.organizations          (insert/update one row)
--   - public.users                  (update org_id on one row)
--   - public.organization_profiles  (insert/update one row)
-- No writes to regulatory_*, hub_*, or any agent/scratchpad tables.
--
-- -----------------------------------------------------------------------------
-- RUNBOOK (after applying this script)
-- -----------------------------------------------------------------------------
--   1. Log in as adamrozichner@gmail.com in dev/staging.
--   2. Navigate to /subscribe?dataComplete=true
--      ("מומלצת" should be the highlighted plan.)
--
--   3. OPTIONAL — to also render the "reasons" block on /subscribe (it
--      reads localStorage, which SQL cannot populate), paste in the
--      browser DevTools console after login:
--
--        const { data: { user } } = await (await import(
--          'https://esm.sh/@supabase/supabase-js'
--        )).createClient(
--          window.NEXT_DATA?.props?.pageProps?.supabaseUrl
--            || '<NEXT_PUBLIC_SUPABASE_URL>',
--          window.NEXT_DATA?.props?.pageProps?.supabaseAnonKey
--            || '<NEXT_PUBLIC_SUPABASE_ANON_KEY>'
--        ).auth.getUser();
--        const uid = user.id;
--        localStorage.setItem('dpo_recommended_tier', 'recommended');
--        localStorage.setItem('dpo_v3_answers_' + uid, JSON.stringify({
--          bizName: 'Adam Test Org (Recommended Flow)',
--          industry: 'health',
--          databases: ['medical','employees'],
--          customDatabases: [],
--          dbDetails: { medical: { size:'10k-100k' }, employees: { size:'100-1k' } },
--          totalSize: '10k-100k',
--          processors: ['Microsoft','AWS'],
--          hasDpo: 'no',
--          securityOwner: 'none',
--          hasConsent: 'no'
--        }));
--        location.reload();
--
--      (Easiest alternative: just grab uid from your Supabase auth state
--      however you normally do.)
--
--   4. To revert: uncomment the ROLLBACK block at the bottom of this file
--      and re-run.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_user_id    uuid;
  v_org_id     uuid;
  v_v3_answers jsonb := jsonb_build_object(
    'bizName',         'Adam Test Org (Recommended Flow)',
    'companyId',       '513999999',
    'industry',        'health',
    'databases',       jsonb_build_array('medical', 'employees'),
    'customDatabases', '[]'::jsonb,
    'dbDetails',       jsonb_build_object(
      'medical',   jsonb_build_object('size', '10k-100k'),
      'employees', jsonb_build_object('size', '100-1k')
    ),
    'totalSize',       '10k-100k',
    'processors',      jsonb_build_array('Microsoft', 'AWS'),
    'hasDpo',          'no',
    'securityOwner',   'none',
    'hasConsent',      'no'
  );
  v_profile_data jsonb;
BEGIN
  v_profile_data := jsonb_build_object(
    'answers',     '[]'::jsonb,
    'v3Answers',   v_v3_answers,
    'internalDpo', NULL,
    'completedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  -- 1. Locate Adam. Abort loudly if this is the wrong env.
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE email = 'adamrozichner@gmail.com'
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'auth.users row for adamrozichner@gmail.com not found — '
      'wrong environment? This script is dev/staging only.';
  END IF;

  -- 2. Idempotent test org. Marker: business_id = 'TEST-ADAM-REC'.
  SELECT id INTO v_org_id
    FROM public.organizations
   WHERE business_id = 'TEST-ADAM-REC'
   LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (
      name, business_id, tier, status,
      dpo_conflict_status, contact_email, owner_email
    ) VALUES (
      'Adam Test Org (Recommended Flow)',
      'TEST-ADAM-REC',
      'recommended'::subscription_tier,
      'onboarding'::org_status,
      'not_assessed',
      'adamrozichner@gmail.com',
      'adamrozichner@gmail.com'
    )
    RETURNING id INTO v_org_id;

    RAISE NOTICE 'Created test org %', v_org_id;
  ELSE
    -- Re-run: re-assert the fields the recommendation flow keys off.
    UPDATE public.organizations
       SET tier   = 'recommended'::subscription_tier,
           status = 'onboarding'::org_status,
           name   = 'Adam Test Org (Recommended Flow)'
     WHERE id = v_org_id;

    RAISE NOTICE 'Reused existing test org %', v_org_id;
  END IF;

  -- 3. Link Adam's users row to the test org (only if not already linked
  --    to a DIFFERENT org — defensive; right now adam.org_id IS NULL).
  UPDATE public.users
     SET org_id = v_org_id
   WHERE auth_user_id = v_user_id
     AND (org_id IS NULL OR org_id = v_org_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'public.users row for % is already linked to a different org. '
      'Refusing to clobber. Inspect manually.', v_user_id;
  END IF;

  -- 4. Idempotent profile with v3Answers that justify 'recommended' via
  --    calculateRecommendedTier (industry=health → first rule fires).
  IF EXISTS (SELECT 1 FROM public.organization_profiles WHERE org_id = v_org_id) THEN
    UPDATE public.organization_profiles
       SET profile_data = v_profile_data
     WHERE org_id = v_org_id;
    RAISE NOTICE 'Updated existing profile for org %', v_org_id;
  ELSE
    INSERT INTO public.organization_profiles (org_id, profile_data)
    VALUES (v_org_id, v_profile_data);
    RAISE NOTICE 'Created profile for org %', v_org_id;
  END IF;
END $$;

COMMIT;


-- -----------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
-- -----------------------------------------------------------------------------
-- Run after COMMIT. Expect 1 row showing tier='recommended', the matching
-- marker, and industry='health' in the stored v3Answers.
SELECT
  u.email                                         AS user_email,
  pu.role                                         AS user_role,
  o.id                                            AS org_id,
  o.name                                          AS org_name,
  o.business_id                                   AS org_marker,
  o.tier                                          AS org_tier,
  o.status                                        AS org_status,
  op.profile_data->'v3Answers'->>'industry'       AS profile_industry,
  jsonb_array_length(
    op.profile_data->'v3Answers'->'databases'
  )                                               AS profile_db_count,
  jsonb_array_length(
    op.profile_data->'v3Answers'->'processors'
  )                                               AS profile_processor_count,
  (SELECT s.status FROM public.subscriptions s
    WHERE s.org_id = o.id
    ORDER BY s.created_at DESC LIMIT 1)           AS latest_sub_status
FROM auth.users u
JOIN public.users pu               ON pu.auth_user_id = u.id
JOIN public.organizations o        ON o.id = pu.org_id
JOIN public.organization_profiles op ON op.org_id = o.id
WHERE u.email = 'adamrozichner@gmail.com'
  AND o.business_id = 'TEST-ADAM-REC';


-- =============================================================================
-- ROLLBACK — uncomment and re-run to revert exactly what this script changed.
-- =============================================================================
-- Reverses: unlinks Adam's users.org_id (only if still pointing at the test
-- org), deletes the organization_profiles row (technically cascade-deleted
-- by the org delete, but explicit for clarity), and deletes the test
-- organizations row.
--
-- Safe to run if the script was never applied — finds nothing, RAISE NOTICE.
-- Refuses to delete if the test org accidentally accumulated payment_logs
-- (the only FK among 38 referencing tables that is NO ACTION rather than
-- CASCADE; left as a safety guard even though the script never creates a
-- subscription).
-- -----------------------------------------------------------------------------
/*
BEGIN;

DO $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
BEGIN
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE email = 'adamrozichner@gmail.com'
   LIMIT 1;

  SELECT id INTO v_org_id
    FROM public.organizations
   WHERE business_id = 'TEST-ADAM-REC'
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No test org found — nothing to roll back.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.payment_logs WHERE org_id = v_org_id) THEN
    RAISE EXCEPTION
      'Test org % has payment_logs entries — refusing to delete. '
      'Inspect manually.', v_org_id;
  END IF;

  -- Unlink Adam only if still pointing at the test org.
  UPDATE public.users
     SET org_id = NULL
   WHERE auth_user_id = v_user_id
     AND org_id = v_org_id;

  -- Explicit even though cascade would handle it.
  DELETE FROM public.organization_profiles WHERE org_id = v_org_id;
  DELETE FROM public.organizations         WHERE id     = v_org_id;

  RAISE NOTICE 'Rolled back test org % and Adam''s link to it.', v_org_id;
END $$;

COMMIT;
*/
