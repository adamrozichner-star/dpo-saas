/*
 * Task 3b GATE: curator WRITE path, all four routes, real HTTP, three cases each,
 * with before/after row checks. Plus mint-redemption parity + CC-2 zero-info, and
 * certify content-scoping. Requires `next dev` on localhost:3000.
 *
 * Cases per route: בדיקה-שותף (assigned != own) -> succeeds + row changed;
 *                  אמיר (unassigned) -> 403 + NO change; קרסטון (other dpo) -> 403 + NO change.
 *
 * Run: set -a; source <(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' .env.local); set +a
 *      npx tsx scripts/verify-curator-writes.ts
 */
import { createClient } from '@supabase/supabase-js'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const CURATOR = { email: 'adamrozichner+bdika@gmail.com', password: 'Bdika-Prod-2026!' }
const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })
let pass = 0, fail = 0
const check = (n: string, c: boolean, d?: string) => { if (c) { pass++; console.log(`  PASS  ${n}`) } else { fail++; console.log(`  FAIL  ${n}${d ? '  ::  ' + d : ''}`) } }

const idByName = async (name: string) => ((await svc.from('organizations').select('id').eq('name', name).maybeSingle()).data as { id: string } | null)?.id ?? null
async function signIn(email: string, password: string) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  return (await r.json()).access_token as string
}
const post = async (token: string, path: string, body: unknown) =>
  fetch(`${BASE}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })

async function main() {
  const token = await signIn(CURATOR.email, CURATOR.password)
  const SHUTAF = (await idByName('בדיקה-שותף'))!, AMIR = (await idByName('אמיר פסטרנק פתרונות פרטיות'))!, KRESTON = (await idByName('קרסטון יועצים'))!
  const ORGS = { SHUTAF, AMIR, KRESTON }
  const cleanup: Array<() => PromiseLike<unknown>> = []
  try {
    // ---- seed: a pending queue item + a pending_review doc in each org ----
    const queueId: Record<string, string> = {}, docId: Record<string, string> = {}
    for (const [k, org] of Object.entries(ORGS)) {
      const q = (await svc.from('dpo_queue').insert({ org_id: org, type: 'review', priority: 'medium', status: 'pending', title: `gate ${k}` }).select('id').single()).data as { id: string }
      queueId[k] = q.id; cleanup.push(() => svc.from('dpo_queue').delete().eq('id', q.id))
      const d = (await svc.from('documents').insert({ org_id: org, type: 'privacy_policy', title: 'gate doc', content: '# x', status: 'pending_review', version: 1, source: 'ledger_render' }).select('id').single()).data as { id: string }
      docId[k] = d.id; cleanup.push(() => svc.from('documents').delete().eq('id', d.id))
    }
    const obligationId = ((await svc.from('obligations').select('id').eq('org_id', SHUTAF).limit(1).maybeSingle()).data as { id: string }).id

    // ================= A. QUEUE RESOLVE =================
    console.log('\n[A] queue resolve')
    const qStatus = async (k: string) => ((await svc.from('dpo_queue').select('status').eq('id', queueId[k]).single()).data as { status: string }).status
    for (const [k, expect] of [['SHUTAF', 200], ['AMIR', 403], ['KRESTON', 403]] as const) {
      const before = await qStatus(k)
      const r = await post(token, `/api/console/clients/${ORGS[k]}/queue/${queueId[k]}/resolve`, { resolutionType: 'manual', notes: 'gate' })
      const after = await qStatus(k)
      check(`queue ${k}: HTTP ${expect}`, r.status === expect, String(r.status))
      if (k === 'SHUTAF') check(`queue ${k}: row CHANGED pending->resolved`, before === 'pending' && after === 'resolved', `${before}->${after}`)
      else check(`queue ${k}: row UNCHANGED (still pending)`, after === 'pending', `${before}->${after}`)
    }

    // ================= B. DOCUMENT APPROVE =================
    console.log('\n[B] document approve')
    const dStatus = async (k: string) => ((await svc.from('documents').select('status').eq('id', docId[k]).single()).data as { status: string }).status
    for (const [k, expect] of [['SHUTAF', 200], ['AMIR', 403], ['KRESTON', 403]] as const) {
      const before = await dStatus(k)
      const r = await post(token, `/api/console/clients/${ORGS[k]}/documents/${docId[k]}/approve`, {})
      const after = await dStatus(k)
      check(`doc ${k}: HTTP ${expect}`, r.status === expect, String(r.status))
      if (k === 'SHUTAF') check(`doc ${k}: row CHANGED pending_review->active`, before === 'pending_review' && after === 'active', `${before}->${after}`)
      else check(`doc ${k}: row UNCHANGED (still pending_review)`, after === 'pending_review', `${before}->${after}`)
    }

    // ================= C. MINT (highest-risk) =================
    console.log('\n[C] mint collection link')
    const linkCount = async (org: string) => ((await svc.from('access_links').select('id', { count: 'exact', head: true }).eq('org_id', org)).count ?? 0)
    let mintedToken = ''
    for (const [k, expect] of [['SHUTAF', 200], ['AMIR', 403], ['KRESTON', 403]] as const) {
      const before = await linkCount(ORGS[k])
      const r = await post(token, `/api/console/clients/${ORGS[k]}/links`, { purpose: 'sysadmin_questionnaire', obligationId, displayName: 'גורם חיצוני' })
      const after = await linkCount(ORGS[k])
      check(`mint ${k}: HTTP ${expect}`, r.status === expect, String(r.status))
      if (k === 'SHUTAF') { check(`mint ${k}: access_links +1`, after === before + 1, `${before}->${after}`); mintedToken = (await r.json()).token }
      else check(`mint ${k}: access_links UNCHANGED`, after === before, `${before}->${after}`)
    }
    cleanup.push(() => svc.from('access_links').delete().eq('org_id', SHUTAF))
    cleanup.push(() => svc.from('tasks').delete().eq('org_id', SHUTAF).eq('assignee_actor', 'sysadmin'))

    // mint redemption parity + CC-2 zero-info: redeem the curator-minted token via
    // the SAME public RPC an owner-minted token uses.
    console.log('\n[C+] mint redemption parity + CC-2 zero-info')
    const anon = createClient(URL, ANON, { auth: { persistSession: false } })
    const { data: resolved } = await anon.rpc('resolve_access_link', { p_token: mintedToken })
    check('curator-minted token REDEEMS via resolve_access_link (valid)', !!resolved && resolved.valid === true, JSON.stringify(resolved)?.slice(0, 120))
    const payload = JSON.stringify(resolved ?? {})
    check('CC-2: redeem payload carries NO org id / business id (zero client info)', !payload.includes(SHUTAF) && !payload.includes('515999002'), payload.slice(0, 160))

    // ================= D. CERTIFY =================
    console.log('\n[D] certify')
    const packCount = async (org: string) => ((await svc.from('audit_packs').select('id', { count: 'exact', head: true }).eq('org_id', org)).count ?? 0)
    let shutafPack = ''
    for (const [k, expect] of [['SHUTAF', 200], ['AMIR', 403], ['KRESTON', 403]] as const) {
      const before = await packCount(ORGS[k])
      const r = await post(token, `/api/console/clients/${ORGS[k]}/certify`, {})
      const after = await packCount(ORGS[k])
      check(`certify ${k}: HTTP ${expect}`, r.status === expect, String(r.status))
      if (k === 'SHUTAF') { check(`certify ${k}: audit_packs +1`, after === before + 1, `${before}->${after}`); shutafPack = (await r.json()).id }
      else check(`certify ${k}: audit_packs UNCHANGED`, after === before, `${before}->${after}`)
    }
    cleanup.push(() => svc.from('audit_packs').delete().eq('org_id', SHUTAF))

    // certify content-scoping: the שותף pack content must be שותף's ledger, NOT דיפו's.
    console.log('\n[D+] certify content is scoped to the path org (בדיקה-שותף), not ambient')
    const content = ((await svc.from('audit_packs').select('content').eq('id', shutafPack).single()).data as { content: string }).content
    check('pack content carries בדיקה-שותף identity (515999002)', content.includes('בדיקה-שותף') && content.includes('515999002'))
    check('pack content does NOT carry דיפו identity (54454446)', !content.includes('54454446'))
  } finally {
    console.log('\n[teardown]')
    for (const fn of cleanup.reverse()) { try { await fn() } catch { /* ignore */ } }
  }
  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('FATAL', e); process.exit(2) })
