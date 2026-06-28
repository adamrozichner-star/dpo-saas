// F2b: cron -> fan-out -> per-org document-freshness check (mirrors
// check-notifications). Proactively recomputes active ledger-render docs'
// fingerprints against the live ledger and raises a 'document_stale' notification
// when one has drifted from its pinned approval - so the DPO is told without
// opening the doc. Reuses F1's render + fingerprint via checkDocFreshnessForOrg.
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { inngest } from '@/inngest/client'
import { checkDocFreshnessForOrg } from '@/lib/doc-freshness'

function serviceSupabase(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const ORG_FRESHNESS_EVENT = 'deepo/documents.freshness.check'

export const dispatchDocFreshness = inngest.createFunction(
  { id: 'documents-freshness-dispatch', retries: 3, triggers: [{ cron: '0 7 * * *' }] },
  async ({ step }) => {
    const orgs = await step.run('fetch-orgs', async () => {
      const supabase = serviceSupabase()
      const { data, error } = await supabase.from('organizations').select('id')
      if (error) throw new Error(`fetch orgs: ${error.message}`)
      return data ?? []
    })
    if (orgs.length === 0) return { orgs_dispatched: 0 }
    await step.sendEvent('fan-out-orgs', orgs.map((o) => ({ name: ORG_FRESHNESS_EVENT, data: { orgId: o.id } })))
    return { orgs_dispatched: orgs.length }
  },
)

export const checkOrgDocFreshness = inngest.createFunction(
  { id: 'documents-freshness-org-check', concurrency: { limit: 5 }, retries: 3, triggers: [{ event: ORG_FRESHNESS_EVENT }] },
  async ({ event, step }) => {
    const { orgId } = event.data as { orgId: string }
    return await step.run('check-freshness', async () => {
      const supabase = serviceSupabase()
      return await checkDocFreshnessForOrg(orgId, supabase)
    })
  },
)
