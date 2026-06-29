// E4 follow-up: the DSAR deemed-refusal alert. A request that goes unanswered
// past the deemed-refusal mark gives the subject standing to petition, so the DPO
// must be nudged BEFORE the mark (Roy, 2026-06-29).
//
// cron -> fan-out -> per-org check, mirroring doc-freshness / check-notifications.
// Per org (service-role) we read the PII-FREE dsar_requests tracking rows, compute
// deemed_refusal_at = created_at + 21d in JS (no column, nothing to migrate), and
// for any open request inside the lead window (or already overdue) we email the DPO
// out-of-band - the same channel the intake handoff uses. The alert carries ONLY
// the correlation_ref (never subject PII); the DPO maps it back to the original
// intake email. A notifications row keyed by correlation_ref + stage is the dedup
// ledger so each stage fires exactly once across daily runs.
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { inngest } from '@/inngest/client'

function serviceSupabase(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const ORG_DSAR_EVENT = 'deepo/dsar.deadline.check'

// The deemed-refusal mark and how many days ahead of it we start warning.
const DEEMED_REFUSAL_DAYS = 21
const WARN_LEAD_DAYS = 5
const DAY_MS = 1000 * 60 * 60 * 24

const REQUEST_TYPE_LABEL: Record<string, string> = {
  access: 'עיון במידע',
  rectification: 'תיקון מידע',
  erasure: 'מחיקת מידע',
  objection: 'התנגדות לעיבוד',
}

type OpenDsar = {
  id: string
  request_type: string
  status: string
  correlation_ref: string
  created_at: string
  access_links: { dpo_notify_email: string | null } | null
}

// Out-of-band nudge to the DPO. PII-free: only the correlation_ref + request type
// + how the deadline sits. Mirrors the intake handoff's transport.
async function sendDeadlineAlert(
  to: string,
  correlationRef: string,
  requestType: string,
  daysToDeemed: number,
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false
  const overdue = daysToDeemed <= 0
  const typeLabel = REQUEST_TYPE_LABEL[requestType] || requestType
  const deadlineLine = overdue
    ? `חלף מועד ${DEEMED_REFUSAL_DAYS} הימים. אי-מענה נחשב לסירוב המקנה לפונה עילה לפנות לרשם.`
    : `נותרו ${Math.ceil(daysToDeemed)} ימים עד מועד ${DEEMED_REFUSAL_DAYS} הימים. יש להשיב לפונה כדי להימנע מסירוב נחזה.`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'Deepo <noreply@deepo.co.il>',
        to,
        subject: `${overdue ? 'בקשת נושא מידע באיחור' : 'תזכורת מועד'} - ${correlationRef}`,
        html: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; padding:20px;">
  <h2>${overdue ? 'בקשת נושא מידע ממתינה למענה' : 'תזכורת: מועד למענה לבקשת נושא מידע'}</h2>
  <p>לבקשה הבאה טרם נרשם מענה במערכת. הטיפול והמענה מתבצעים מחוץ למערכת, מול הפונה ישירות.</p>
  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
    <p><strong>מספר מעקב:</strong> ${correlationRef}</p>
    <p><strong>סוג בקשה:</strong> ${typeLabel}</p>
  </div>
  <p style="color:#92400e;">${deadlineLine}</p>
</body></html>`,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function checkDsarDeadlinesForOrg(orgId: string, supabase: SupabaseClient) {
  const now = Date.now()

  // Open requests only: completed / rejected are done, no deadline to chase.
  const { data, error } = await supabase
    .from('dsar_requests')
    .select('id, request_type, status, correlation_ref, created_at, access_links(dpo_notify_email)')
    .eq('org_id', orgId)
    .not('status', 'in', '(completed,rejected)')
  if (error) throw new Error(`fetch dsar_requests: ${error.message}`)

  const rows = (data ?? []) as unknown as OpenDsar[]
  let alerted = 0

  for (const r of rows) {
    const deemedAt = new Date(r.created_at).getTime() + DEEMED_REFUSAL_DAYS * DAY_MS
    const daysToDeemed = (deemedAt - now) / DAY_MS

    // Two stages, each emitted at most once via the dedup row:
    //   warning  - inside the lead window, mark not yet passed
    //   overdue  - past the deemed-refusal mark
    let stage: 'warning' | 'overdue' | null = null
    if (daysToDeemed <= 0) stage = 'overdue'
    else if (daysToDeemed <= WARN_LEAD_DAYS) stage = 'warning'
    if (!stage) continue

    const type = stage === 'overdue' ? 'dsar:critical' : 'dsar:warning'
    const title =
      stage === 'overdue'
        ? `בקשת נושא מידע ${r.correlation_ref} חלף מועד המענה`
        : `בקשת נושא מידע ${r.correlation_ref} מתקרבת למועד המענה`
    const body =
      stage === 'overdue'
        ? `חלפו ${DEEMED_REFUSAL_DAYS} ימים ממועד הבקשה ללא מענה רשום. אי-מענה נחשב לסירוב.`
        : `נותרו ${Math.ceil(daysToDeemed)} ימים עד מועד ${DEEMED_REFUSAL_DAYS} הימים. יש להשיב לפונה.`

    // Dedup ledger: the UNIQUE INDEX on (org_id, type, title) makes the daily re-run
    // a no-op. We email only when this is the first time we record the stage.
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('org_id', orgId)
      .eq('type', type)
      .eq('title', title)
      .limit(1)
      .maybeSingle()
    if (existing) continue

    const { error: insErr } = await supabase
      .from('notifications')
      .upsert({ org_id: orgId, type, title, body, link: '/console' }, { onConflict: 'org_id,type,title', ignoreDuplicates: true })
    if (insErr) {
      console.error('[DSAR Deadline] insert error:', insErr.message, 'for', r.correlation_ref)
      continue
    }

    const dpoEmail = r.access_links?.dpo_notify_email ?? null
    if (dpoEmail) {
      await sendDeadlineAlert(dpoEmail, r.correlation_ref, r.request_type, daysToDeemed)
    } else {
      console.warn('[DSAR Deadline] no dpo_notify_email for', r.correlation_ref, '- notification row only')
    }
    alerted++
  }

  return { orgId, open: rows.length, alerted }
}

export const dispatchDsarDeadline = inngest.createFunction(
  { id: 'dsar-deadline-dispatch', retries: 3, triggers: [{ cron: '0 8 * * *' }] },
  async ({ step }) => {
    const orgs = await step.run('fetch-orgs', async () => {
      const supabase = serviceSupabase()
      const { data, error } = await supabase.from('organizations').select('id')
      if (error) throw new Error(`fetch orgs: ${error.message}`)
      return data ?? []
    })
    if (orgs.length === 0) return { orgs_dispatched: 0 }
    await step.sendEvent('fan-out-orgs', orgs.map((o) => ({ name: ORG_DSAR_EVENT, data: { orgId: o.id } })))
    return { orgs_dispatched: orgs.length }
  },
)

export const checkOrgDsarDeadline = inngest.createFunction(
  { id: 'dsar-deadline-org-check', concurrency: { limit: 5 }, retries: 3, triggers: [{ event: ORG_DSAR_EVENT }] },
  async ({ event, step }) => {
    const { orgId } = event.data as { orgId: string }
    return await step.run('check-dsar-deadlines', async () => {
      const supabase = serviceSupabase()
      return await checkDsarDeadlinesForOrg(orgId, supabase)
    })
  },
)
