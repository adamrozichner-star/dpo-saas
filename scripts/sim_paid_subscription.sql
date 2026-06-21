-- =============================================================================
-- scripts/sim_paid_subscription.sql
--
-- Simulates a successful Cardcom payment for the Recommended package
-- for the user adamrozichner@gmail.com so paid-tier features
-- (DPO inbox, chat, message threads, etc.) can be tested end-to-end
-- without running a real payment through Cardcom.
--
-- THROWAWAY TEST DATA. Dev/staging only. Do NOT run against production.
--
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
-- -----------------------------------------------------------------------------
-- Mirrors the writes that src/app/api/cardcom/webhook/route.ts performs on
-- successful payment (lines 197-236):
--
--   1. UPDATE public.organizations
--      - subscription_status = 'active'
--      - tier                = 'recommended' (no-op if already set)
--      - status              = 'active'      (no-op if already set)
--      - subscription_start_date / subscription_end_date (now / now+1mo)
--      - last_payment_date / last_payment_amount
--      - payment_token / payment_card_mask  ← marker fields
--
--   2. Upsert public.subscriptions row
--      - status = 'active'   ← THIS is what useSubscriptionGate() checks
--      - tier   = 'recommended'
--      - monthly_price / dpo_minutes_quota from the webhook's PLAN_DETAILS
--      - token  = 'SIMULATED-PAYMENT-TOKEN' ← marker for rollback id
--
-- Skipped vs the real webhook:
--   - payment_transactions UPDATE (the real webhook expects a row created
--     earlier by /api/cardcom/create-payment; no equivalent here, and the
--     subscription gate does not read payment_transactions).
--   - billing_cycle_start on subscriptions — webhook writes this but the
--     column does not exist in the current schema. (Real-bug-to-fix-later,
--     not this script's concern.)
--
-- The single source of truth for "is this org paid" is the
-- subscriptions.status check inside src/lib/use-subscription-gate.ts
-- (lines 56-61). Our INSERT makes that gate return isPaid=true; everything
-- else is denormalized payment metadata for the dashboard / settings UIs.
--
-- -----------------------------------------------------------------------------
-- IDEMPOTENT + REVERSIBLE
-- -----------------------------------------------------------------------------
-- subscriptions has no unique constraint on org_id, so we use a DO block
-- with SELECT-then-update-or-insert keyed by org_id. Marker for the test
-- row: token='SIMULATED-PAYMENT-TOKEN'.
--
-- ROLLBACK block at the bottom (commented out). Uncomment and re-run to:
--   - DELETE the subscriptions row carrying the marker token
--   - Reset organizations payment fields IF and only IF
--     organizations.payment_token = 'SIMULATED-PAYMENT-TOKEN'
--     (so it refuses to touch a row that's since been updated by a real
--      payment flow).
--
-- -----------------------------------------------------------------------------
-- FIREWALL RESPECTED
-- -----------------------------------------------------------------------------
-- Writes only to public.organizations + public.subscriptions for the one
-- org adamrozichner@gmail.com is linked to. No writes to regulatory_*,
-- hub_*, or agent/scratchpad tables.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_user_id       uuid;
  v_org_id        uuid;
  v_existing_sub  uuid;
  v_now           timestamptz := now();
  v_end           timestamptz := now() + interval '1 month';
  v_token         text := 'SIMULATED-PAYMENT-TOKEN';
  v_card_mask     text := '****0000';
  v_plan          text := 'recommended';
  v_price         numeric := 999;
  v_quota         int     := 30;
BEGIN
  -- 1. Locate Adam. Abort loudly if this is the wrong env.
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE email = 'adamrozichner@gmail.com'
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'auth.users row for adamrozichner@gmail.com not found — wrong environment? Dev/staging only.';
  END IF;

  -- 2. Locate his org. Abort if not onboarded — payment simulation requires
  --    an org to attach the subscription to.
  SELECT org_id INTO v_org_id
    FROM public.users
   WHERE auth_user_id = v_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION
      'public.users.org_id is NULL for adamrozichner@gmail.com — '
      'run onboarding first (or apply scripts/sim_recommended_package.sql).';
  END IF;

  -- 3. Mirror webhook's organizations.update (lines 197-207).
  --    Force tier='recommended' even if currently different — this script's
  --    contract is "simulate paid Recommended", so we set the tier to match.
  UPDATE public.organizations
     SET subscription_status     = 'active',
         tier                    = v_plan::subscription_tier,
         status                  = 'active'::org_status,
         subscription_start_date = v_now,
         subscription_end_date   = v_end,
         last_payment_date       = v_now,
         last_payment_amount     = v_price::int,
         payment_token           = v_token,
         payment_card_mask       = v_card_mask
   WHERE id = v_org_id;

  RAISE NOTICE 'Updated organizations row % (tier=%, sub_status=active).', v_org_id, v_plan;

  -- 4. Mirror webhook's subscriptions upsert (lines 209-236).
  --    No unique constraint on org_id → SELECT-then-update-or-insert.
  SELECT id INTO v_existing_sub
    FROM public.subscriptions
   WHERE org_id = v_org_id
   LIMIT 1;

  IF v_existing_sub IS NOT NULL THEN
    UPDATE public.subscriptions
       SET tier              = v_plan::subscription_tier,
           monthly_price     = v_price,
           dpo_minutes_quota = v_quota,
           dpo_minutes_used  = 0,
           status            = 'active'::subscription_status,
           token             = v_token,
           last_payment_at   = v_now,
           cancelled_at      = NULL,
           cancellation_reason = NULL
     WHERE id = v_existing_sub;
    RAISE NOTICE 'Updated existing subscription %', v_existing_sub;
  ELSE
    INSERT INTO public.subscriptions (
      org_id, tier, monthly_price, dpo_minutes_quota,
      dpo_minutes_used, status, token, last_payment_at
    ) VALUES (
      v_org_id,
      v_plan::subscription_tier,
      v_price,
      v_quota,
      0,
      'active'::subscription_status,
      v_token,
      v_now
    );
    RAISE NOTICE 'Created new subscription for org %', v_org_id;
  END IF;
END $$;

COMMIT;


-- -----------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
-- -----------------------------------------------------------------------------
-- Expect one row showing tier='recommended', sub_status='active',
-- gate_isPaid=true (the criterion used by useSubscriptionGate).
SELECT
  u.email,
  o.id                     AS org_id,
  o.name                   AS org_name,
  o.tier                   AS org_tier,
  o.subscription_status    AS org_sub_status,
  o.status                 AS org_lifecycle_status,
  o.last_payment_amount,
  o.subscription_end_date,
  o.payment_token          AS org_payment_token,
  s.id                     AS subscription_id,
  s.status                 AS sub_status,
  s.tier                   AS sub_tier,
  s.monthly_price,
  s.dpo_minutes_quota,
  s.token                  AS sub_token,
  -- This boolean matches the gate's check.
  (s.status IN ('active','past_due')) AS gate_isPaid
FROM auth.users u
JOIN public.users pu          ON pu.auth_user_id = u.id
JOIN public.organizations o   ON o.id = pu.org_id
LEFT JOIN public.subscriptions s ON s.org_id = o.id AND s.token = 'SIMULATED-PAYMENT-TOKEN'
WHERE u.email = 'adamrozichner@gmail.com';


-- =============================================================================
-- ROLLBACK — uncomment and re-run to undo the simulated payment.
-- =============================================================================
-- Strict: only modifies rows whose markers prove they came from this script
-- (subscriptions.token='SIMULATED-PAYMENT-TOKEN', organizations.payment_token
-- ='SIMULATED-PAYMENT-TOKEN'). If a real payment landed in the meantime and
-- overwrote the markers, this rollback safely no-ops.
-- -----------------------------------------------------------------------------
/*
BEGIN;

DO $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_marker  text := 'SIMULATED-PAYMENT-TOKEN';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'adamrozichner@gmail.com';
  SELECT org_id INTO v_org_id FROM public.users WHERE auth_user_id = v_user_id;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No org linked to user — nothing to roll back.';
    RETURN;
  END IF;

  -- 1. Remove the simulated subscription (only if marker matches).
  DELETE FROM public.subscriptions
   WHERE org_id = v_org_id
     AND token  = v_marker;

  -- 2. Reset organizations payment fields ONLY if the marker is intact —
  --    prevents wiping real payment data that arrived after the simulation.
  UPDATE public.organizations
     SET subscription_status     = 'none',
         subscription_start_date = NULL,
         subscription_end_date   = NULL,
         last_payment_date       = NULL,
         last_payment_amount     = NULL,
         payment_token           = NULL,
         payment_card_mask       = NULL
   WHERE id = v_org_id
     AND payment_token = v_marker;

  RAISE NOTICE 'Rolled back simulated payment for org % (where markers matched).', v_org_id;
END $$;

COMMIT;
*/
