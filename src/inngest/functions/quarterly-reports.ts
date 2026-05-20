// Quarterly DPO report generation, migrated off the broken Vercel cron at
// /api/cron/quarterly-reports.
//
//   dispatchQuarterlyReports      cron '0 6 1 1,4,7,10 *', emits per-org events
//   generateOrgQuarterlyReport    handles one org: dedupe + generate + insert
//
// Note: generateDpoReportDraft is currently a pure Supabase-aggregation +
// templating helper (no Anthropic calls). If/when it grows an LLM step, that
// call should route through createMessage() from src/lib/anthropic.ts so the
// per-process concurrency cap is shared with the rest of the app — and this
// function's per-fn concurrency should stay aligned with that cap.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';
import { generateDpoReportDraft } from '@/lib/dpo-report-generator';

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const REPORT_EVENT = 'deepo/reports.org.generate';

export const dispatchQuarterlyReports = inngest.createFunction(
  {
    id: 'reports-quarterly-dispatch',
    retries: 3,
    triggers: [{ cron: '0 6 1 1,4,7,10 *' }],
  },
  async ({ step }) => {
    // Compute the period once at dispatch time so every per-org event in this
    // run targets the same quarter, even if the clock crosses midnight while
    // the events drain.
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3);
    const period_start = new Date(now.getFullYear(), q * 3, 1).toISOString();
    const period_end = new Date(
      now.getFullYear(),
      q * 3 + 3,
      0,
      23,
      59,
      59,
    ).toISOString();

    const orgs = await step.run('fetch-active-orgs', async () => {
      const supabase = serviceSupabase();
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('subscription_status', 'active');
      if (error) throw new Error(`fetch active orgs: ${error.message}`);
      return data ?? [];
    });

    if (orgs.length === 0) {
      return { orgs_dispatched: 0, period_start, period_end };
    }

    await step.sendEvent(
      'fan-out-quarterly',
      orgs.map(o => ({
        name: REPORT_EVENT,
        data: { orgId: o.id, period_start, period_end },
      })),
    );

    return { orgs_dispatched: orgs.length, period_start, period_end };
  },
);

export const generateOrgQuarterlyReport = inngest.createFunction(
  {
    id: 'reports-org-generate',
    concurrency: { limit: 5 },
    retries: 3,
    triggers: [{ event: REPORT_EVENT }],
  },
  async ({ event, step }) => {
    const { orgId, period_start, period_end } = event.data as {
      orgId: string;
      period_start: string;
      period_end: string;
    };
    const periodStartDay = period_start.split('T')[0];

    const existing = await step.run('check-existing', async () => {
      const supabase = serviceSupabase();
      const { data } = await supabase
        .from('dpo_reports')
        .select('id')
        .eq('org_id', orgId)
        .eq('period_start', periodStartDay)
        .maybeSingle();
      return data;
    });

    if (existing) {
      return {
        orgId,
        period_start,
        status: 'skipped',
        reason: 'already exists',
      };
    }

    await step.run('generate-and-insert', async () => {
      const supabase = serviceSupabase();
      const draft = await generateDpoReportDraft(orgId, supabase, {
        start: new Date(period_start),
        end: new Date(period_end),
      });
      const { error } = await supabase
        .from('dpo_reports')
        .insert({ org_id: orgId, ...draft, status: 'draft' });
      if (error) throw new Error(`insert dpo_report: ${error.message}`);
    });

    return { orgId, period_start, status: 'generated' };
  },
);
