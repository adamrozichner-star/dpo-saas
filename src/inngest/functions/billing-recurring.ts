// Daily recurring billing, migrated off the old Vercel cron at
// /api/billing/recurring.
//
//   dispatchRecurringBilling  cron '0 6 * * *', fans out one event per due org
//   chargeOrgRecurring         per-org charge handler, money path
//
// Idempotency story (this is the fix the migration ships):
//
//   1. Inngest function-level `idempotency` keyed on (orgId, billingPeriod)
//      prevents Inngest's own retries / duplicate event delivery from invoking
//      the function more than once per org per day.
//
//   2. payment_transactions.id uses `recurring_${orgId}_${billingPeriod}` as
//      a deterministic PK (YYYYMMDD). The dedup check at the top of the
//      handler aborts before calling Cardcom if a row already exists for
//      this (org, day). If somehow we get past that check and try to insert,
//      the PK collision in Postgres is the last-line safety net.
//
//   3. The old code used `recurring_${orgId}_${Date.now()}` which generated a
//      new PK every retry, so collision protection was accidental rather than
//      designed. That's the latent double-charge bug being closed.
//
// Cardcom logic is unchanged — `chargeToken` is invoked with the same
// arguments as the old cron. Only the surrounding flow shape changes.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';
import { chargeToken } from '@/lib/cardcom';

const PLANS = {
  basic: { monthly: 500, name: 'חבילה בסיסית' },
  recommended: { monthly: 999, name: 'חבילה מומלצת' },
  premium: { monthly: 4500, name: 'חבילה פרימיום' },
  enterprise: { monthly: 0, name: 'חבילה ארגונית' },
} as const;

type PlanKey = keyof typeof PLANS;

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const CHARGE_EVENT = 'deepo/billing.org.charge';

// YYYYMMDD — per-day granularity so daily retries on the failure path can
// each record an attempt while same-day Inngest retries are still deduped.
function billingPeriodDay(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export const dispatchRecurringBilling = inngest.createFunction(
  {
    id: 'billing-recurring-dispatch',
    retries: 3,
    triggers: [{ cron: '0 6 * * *' }],
  },
  async ({ step }) => {
    const today = new Date();
    const billingPeriod = billingPeriodDay(today);

    const dueOrgs = await step.run('fetch-due-orgs', async () => {
      const supabase = serviceSupabase();
      const todayStr = today.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('subscription_status', 'active')
        .not('payment_token', 'is', null)
        .lte('subscription_end_date', `${todayStr}T23:59:59Z`);
      if (error) throw new Error(`fetch due orgs: ${error.message}`);
      return data ?? [];
    });

    if (dueOrgs.length === 0) {
      return { orgs_due: 0, billing_period: billingPeriod };
    }

    await step.sendEvent(
      'fan-out-billing',
      dueOrgs.map(o => ({
        name: CHARGE_EVENT,
        data: { orgId: o.id, billingPeriod },
      })),
    );

    return { orgs_due: dueOrgs.length, billing_period: billingPeriod };
  },
);

export const chargeOrgRecurring = inngest.createFunction(
  {
    id: 'billing-org-charge',
    concurrency: { limit: 5 },
    retries: 3,
    idempotency: 'event.data.orgId + "-" + event.data.billingPeriod',
    triggers: [{ event: CHARGE_EVENT }],
  },
  async ({ event, step }) => {
    const { orgId, billingPeriod } = event.data as {
      orgId: string;
      billingPeriod: string;
    };
    const txId = `recurring_${orgId}_${billingPeriod}`;

    // 1. Dedup at the DB level — if any prior attempt (success or failure)
    // for this (org, day) already left a row, skip the whole money path.
    const existing = await step.run('check-existing-tx', async () => {
      const supabase = serviceSupabase();
      const { data } = await supabase
        .from('payment_transactions')
        .select('id, status')
        .eq('id', txId)
        .maybeSingle();
      return data;
    });

    if (existing) {
      return {
        orgId,
        billingPeriod,
        status: 'skipped',
        reason: `transaction ${txId} already exists (status=${existing.status})`,
      };
    }

    // 2. Load the org + the user we'll bill / email.
    const ctx = await step.run('load-org-and-user', async () => {
      const supabase = serviceSupabase();
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (orgErr || !org) {
        throw new Error(`load org ${orgId}: ${orgErr?.message || 'not found'}`);
      }
      const { data: orgUser } = await supabase
        .from('users')
        .select('auth_user_id, email')
        .eq('org_id', orgId)
        .limit(1)
        .single();
      return { org, orgUser };
    });

    const { org, orgUser } = ctx;
    const userEmail: string | undefined = orgUser?.email;
    const userId: string | undefined = orgUser?.auth_user_id;

    if (!org.tier || !(org.tier in PLANS)) {
      return {
        orgId,
        billingPeriod,
        status: 'skipped',
        reason: `org.tier '${org.tier}' is not a billable plan`,
      };
    }

    const plan = PLANS[org.tier as PlanKey];
    const amount = plan.monthly;

    // 3. Cardcom charge — call signature is unchanged from the old cron.
    const chargeResult = await step.run('charge-card', async () => {
      return chargeToken({
        token: org.payment_token,
        tokenExpiry: org.payment_token_expiry || '',
        amount,
        productName: `Deepo - ${plan.name} (חודשי)`,
        customerEmail: userEmail,
      });
    });

    if (chargeResult.success) {
      // 4a. Extend subscription + reset failed-attempts counter.
      await step.run('extend-subscription', async () => {
        const supabase = serviceSupabase();
        const newEndDate = new Date(org.subscription_end_date);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        const { error } = await supabase
          .from('organizations')
          .update({
            subscription_end_date: newEndDate.toISOString(),
            last_payment_date: new Date().toISOString(),
            last_payment_amount: amount,
            failed_payment_attempts: 0,
          })
          .eq('id', orgId);
        if (error) throw new Error(`extend subscription: ${error.message}`);
      });

      // 4b. Log the success transaction with deterministic PK.
      await step.run('log-success-tx', async () => {
        const supabase = serviceSupabase();
        const { error } = await supabase
          .from('payment_transactions')
          .insert({
            id: txId,
            org_id: orgId,
            user_id: userId,
            amount,
            plan: org.tier,
            is_annual: false,
            status: 'completed',
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          });
        if (error) throw new Error(`log success tx: ${error.message}`);
      });

      // 4c. Receipt email — same fire-and-forget shape as the old cron, but
      // checkpointed so retries don't re-send. Email failure does NOT fail
      // the charge.
      if (userEmail) {
        await step.run('send-receipt', async () => {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: userEmail,
                template: 'payment_success',
                data: {
                  userName: org.name,
                  plan: org.tier,
                  amount,
                  isAnnual: false,
                  isRecurring: true,
                },
              }),
            });
          } catch (e) {
            console.error('Failed to send receipt email:', e);
          }
        });
      }

      return { orgId, billingPeriod, status: 'completed', transactionId: txId };
    }

    // 5. Failure path — bump failed_payment_attempts, mark past_due at 3,
    // log a failure row with the same deterministic PK so tomorrow's run
    // can still record a fresh attempt under its own YYYYMMDD key.
    await step.run('mark-failure', async () => {
      const supabase = serviceSupabase();
      const failedAttempts = (org.failed_payment_attempts || 0) + 1;
      const update: Record<string, unknown> = {
        failed_payment_attempts: failedAttempts,
      };
      if (failedAttempts >= 3) update.subscription_status = 'past_due';
      const { error } = await supabase
        .from('organizations')
        .update(update)
        .eq('id', orgId);
      if (error) throw new Error(`mark failure: ${error.message}`);
    });

    await step.run('log-failure-tx', async () => {
      const supabase = serviceSupabase();
      const { error } = await supabase
        .from('payment_transactions')
        .insert({
          id: txId,
          org_id: orgId,
          user_id: userId,
          amount,
          plan: org.tier,
          is_annual: false,
          status: 'failed',
          error_text: chargeResult.error,
          created_at: new Date().toISOString(),
        });
      if (error) throw new Error(`log failure tx: ${error.message}`);
    });

    return {
      orgId,
      billingPeriod,
      status: 'failed',
      transactionId: txId,
      error: chargeResult.error,
    };
  },
);
