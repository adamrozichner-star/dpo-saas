// Cron → fan-out → per-org pattern for daily notification checks.
//
//   dispatchDailyNotifications  cron '0 6 * * *', emits 1 event per org
//   checkOrgNotifications       handles one org, concurrency-limited to 10
//
// Replaces the sequential org loop in
// src/app/api/cron/check-notifications/route.ts. The Vercel cron entry for
// that route is removed in this PR; Inngest now owns the schedule.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';
import { checkAndCreateNotificationsForOrg } from '@/lib/notifications-trigger';

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const ORG_CHECK_EVENT = 'deepo/notifications.org.check';

export const dispatchDailyNotifications = inngest.createFunction(
  {
    id: 'notifications-daily-dispatch',
    retries: 3,
    triggers: [{ cron: '0 6 * * *' }],
  },
  async ({ step }) => {
    // Decided once, at dispatch time, so all per-org events for the same run
    // see the same flag — avoids a race where the day flips mid-run.
    const now = new Date();
    const runQuarterlyPass =
      [1, 4, 7, 10].includes(now.getMonth() + 1) && now.getDate() === 1;

    const orgs = await step.run('fetch-orgs', async () => {
      const supabase = serviceSupabase();
      const { data, error } = await supabase
        .from('organizations')
        .select('id');
      if (error) throw new Error(`fetch orgs: ${error.message}`);
      return data ?? [];
    });

    if (orgs.length === 0) {
      return { orgs_dispatched: 0, run_quarterly_pass: runQuarterlyPass };
    }

    await step.sendEvent(
      'fan-out-orgs',
      orgs.map(o => ({
        name: ORG_CHECK_EVENT,
        data: { orgId: o.id, runQuarterlyPass },
      })),
    );

    return { orgs_dispatched: orgs.length, run_quarterly_pass: runQuarterlyPass };
  },
);

export const checkOrgNotifications = inngest.createFunction(
  {
    id: 'notifications-org-check',
    concurrency: { limit: 5 },
    retries: 3,
    triggers: [{ event: ORG_CHECK_EVENT }],
  },
  async ({ event, step }) => {
    const { orgId, runQuarterlyPass } = event.data as {
      orgId: string;
      runQuarterlyPass: boolean;
    };
    await step.run('check-and-create', async () => {
      const supabase = serviceSupabase();
      await checkAndCreateNotificationsForOrg(orgId, supabase, {
        runQuarterlyPass,
      });
    });
    return { orgId, runQuarterlyPass };
  },
);
