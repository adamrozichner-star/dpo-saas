// Weekly regulatory ingest. Runs every Sunday at 02:00 UTC (04:00/05:00
// Israel time). Calls runIngest with the seed URL list and persists the
// summary to audit_logs.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';
import { runIngest } from '@/lib/regulatory/orchestrator';
import { SEED_URLS } from '@/lib/regulatory/seed-urls';

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const regulatoryIngestWeekly = inngest.createFunction(
  {
    id: 'regulatory-ingest-weekly',
    name: 'Regulatory Ingest (weekly)',
    retries: 2,
    triggers: [{ cron: '0 2 * * 0' }],
  },
  async ({ step }) => {
    const result = await step.run('run-ingest', async () => {
      return runIngest(SEED_URLS);
    });

    // Persist the run summary to audit_logs. org_id is null because
    // regulatory ingest is global, not per-tenant.
    await step.run('write-audit-log', async () => {
      const sb = serviceSupabase();
      const { error } = await sb.from('audit_logs').insert({
        action: 'regulatory_ingest_run',
        entity_type: 'regulatory_documents',
        details: {
          processed: result.processed,
          created: result.created,
          updated: result.updated,
          unchanged: result.unchanged,
          failed: result.failed,
          per_url: result.perUrl,
        },
      });
      if (error) {
        // Don't fail the run — audit logging is best-effort.
        // eslint-disable-next-line no-console
        console.error(JSON.stringify({
          event: 'audit_log_write_failed',
          ts: new Date().toISOString(),
          error: error.message,
        }));
      }
    });

    return result;
  },
);
