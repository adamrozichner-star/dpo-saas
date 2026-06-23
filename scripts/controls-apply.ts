/* Controls apply (B3). Seeds the provisional playbooks, instantiates per-org
 * controls, links obligations (fulfilled_by_control_id + recurs_at), double-runs
 * to prove idempotency, then verifies.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/controls-apply.ts
 */
import { planControls, buildPlaybookUpsertSql, buildControlUpsertSql, buildObligationLinkSql, type ControlPlan } from '../src/lib/ledger/controls'
import { seedPlaybooks, ruleToPlaybook } from '../src/lib/ledger/seed-playbooks'

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'nedkrxjwmyhabrsscyem'
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const r = await fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const text = await r.text()
  const json = JSON.parse(text)
  if (!Array.isArray(json)) throw new Error(`query failed: ${text.slice(0, 400)}`)
  return json as T[]
}

async function obligationsByOrg(): Promise<Map<string, string[]>> {
  const rows = await sql<{ org_id: string; source_rule_id: string | null }>(`select org_id, source_rule_id from obligations`)
  const m = new Map<string, string[]>()
  for (const r of rows) {
    if (!r.source_rule_id) continue
    const list = m.get(r.org_id) ?? []
    list.push(r.source_rule_id)
    m.set(r.org_id, list)
  }
  return m
}

// Instantiate controls + link obligations for every org. Returns total control count.
async function runInstantiate(appliedAt: Date): Promise<number> {
  const byOrg = await obligationsByOrg()
  for (const [orgId, rules] of Array.from(byOrg)) {
    const plans = planControls(orgId, rules.map((r) => ({ sourceRuleId: r })), seedPlaybooks, ruleToPlaybook, appliedAt)
    if (plans.length === 0) continue
    // Upsert controls; RETURNING gives the actual (conflict-preserved) next_due_at + id.
    const returned = await sql<{ id: string; source_playbook_id: string; source_playbook_version: number; next_due_at: string }>(
      buildControlUpsertSql(plans),
    )
    // Link each obligation to its control, recurs_at = the control's real next_due_at.
    for (const row of returned) {
      const plan = plans.find((p: ControlPlan) => p.playbookTemplateId === row.source_playbook_id && p.playbookVersion === row.source_playbook_version)
      if (!plan) continue
      await sql(buildObligationLinkSql(orgId, row.id, plan.ruleTemplateIds, new Date(row.next_due_at).toISOString()))
    }
  }
  const [{ n }] = await sql<{ n: number }>(`select count(*)::int as n from controls`)
  return n
}

async function main() {
  console.log('=== seeding provisional control playbooks ===')
  await sql(buildPlaybookUpsertSql(seedPlaybooks))
  const [{ n: pb }] = await sql<{ n: number }>(`select count(*)::int as n from hub_control_playbooks where active`)
  console.log(`active hub_control_playbooks now: ${pb}\n`)

  console.log('=== idempotency: instantiate twice ===')
  const appliedAt = new Date()
  const n1 = await runInstantiate(appliedAt)
  console.log(`PASS 1: controls now = ${n1}`)
  const n2 = await runInstantiate(new Date(appliedAt.getTime() + 5000)) // different clock; must NOT create new controls
  console.log(`PASS 2: controls now = ${n2}`)
  console.log(n1 === n2 ? `IDEMPOTENT: stable at ${n1} controls` : `PROBLEM: n1=${n1} n2=${n2}`)

  console.log('\n=== verify: controls (cadence, next_due_at, playbook) ===')
  console.log(JSON.stringify(await sql(
    `select c.cadence, c.owner_role, c.next_due_at, c.source_playbook_id, p.name
     from controls c join hub_control_playbooks p on p.template_id=c.source_playbook_id and p.version=c.source_playbook_version
     order by p.name`,
  ), null, 2))

  console.log('\n=== verify: obligations now linked (fulfilled_by_control_id + recurs_at) ===')
  console.log(JSON.stringify(await sql(
    `select o.title, o.severity, (o.fulfilled_by_control_id is not null) as linked, o.recurs_at, p.name as control
     from obligations o
     left join controls c on c.id=o.fulfilled_by_control_id
     left join hub_control_playbooks p on p.template_id=c.source_playbook_id and p.version=c.source_playbook_version
     order by o.severity, o.title`,
  ), null, 2))
  const [{ n: linked }] = await sql<{ n: number }>(`select count(*)::int as n from obligations where fulfilled_by_control_id is not null and recurs_at is not null`)
  console.log(`obligations linked + recurs_at set: ${linked} (expect 4)`)

  console.log('\n=== verify: relacl anon on controls (MUST be empty) ===')
  const anon = await sql(
    `select pg_get_userbyid(a.grantee) as grantee, a.privilege_type
     from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     cross join lateral aclexplode(c.relacl) a
     where c.relname='controls' and pg_get_userbyid(a.grantee)='anon'`,
  )
  console.log(anon.length === 0 ? 'anon has ZERO privileges on controls (ok)' : JSON.stringify(anon))
}

main().catch((e) => { console.error(e); process.exit(1) })
