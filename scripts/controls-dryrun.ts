/* Controls dry-run (B3). READ-ONLY: computes which controls the instantiator
 * WOULD create per org and the next_due_at each gets, and which obligations each
 * control would satisfy. Writes nothing.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/controls-dryrun.ts
 */
import { planControls } from '../src/lib/ledger/controls'
import { seedPlaybooks, ruleToPlaybook } from '../src/lib/ledger/seed-playbooks'

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'nedkrxjwmyhabrsscyem'
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const r = await fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const text = await r.text()
  const json = JSON.parse(text)
  if (!Array.isArray(json)) throw new Error(`query failed: ${text.slice(0, 300)}`)
  return json as T[]
}

async function main() {
  const appliedAt = new Date()
  const obs = await sql<{ org_id: string; org: string; source_rule_id: string | null }>(
    `select o.org_id, org.name as org, o.source_rule_id
     from obligations o join organizations org on org.id = o.org_id order by org.name`,
  )
  const [{ n: controlsNow }] = await sql<{ n: number }>(`select count(*)::int as n from controls`)
  console.log(`Seed playbooks: ${seedPlaybooks.length} (provisional). Controls live now: ${controlsNow}`)
  console.log(`appliedAt (reference now): ${appliedAt.toISOString()}\n`)

  const byOrg = new Map<string, { name: string; rules: string[] }>()
  for (const o of obs) {
    if (!o.source_rule_id) continue
    const e = byOrg.get(o.org_id) ?? { name: o.org, rules: [] }
    e.rules.push(o.source_rule_id)
    byOrg.set(o.org_id, e)
  }

  let totalControls = 0
  for (const [orgId, { name, rules }] of Array.from(byOrg)) {
    const plans = planControls(orgId, rules.map((r) => ({ sourceRuleId: r })), seedPlaybooks, ruleToPlaybook, appliedAt)
    totalControls += plans.length
    console.log(`========================================================`)
    console.log(`ORG: ${name} (${orgId})  obligations: ${rules.length}  ->  controls: ${plans.length}`)
    for (const p of plans) {
      const pb = seedPlaybooks.find((x) => x.templateId === p.playbookTemplateId)!
      console.log(`  CONTROL: ${pb.name}`)
      console.log(`    playbook ${p.playbookTemplateId} v${p.playbookVersion}, cadence=${p.cadence}, next_due_at=${p.nextDueAtIso}`)
      console.log(`    satisfies obligations from rules: ${p.ruleTemplateIds.join(', ')}`)
      console.log(`    -> those obligations get fulfilled_by_control_id + recurs_at=${p.nextDueAtIso}`)
    }
    console.log('')
  }
  console.log(`========================================================`)
  console.log(`TOTAL controls that WOULD be created: ${totalControls}  (dry-run only, nothing written)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
