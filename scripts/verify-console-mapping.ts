/* C1 mapping verification (credential-free). Reads דיפו's LIVE ledger rows via
 * the Management API and runs the SAME pure mapping the console uses, asserting
 * the real data maps to the right A4 view props + status.ts colors.
 *
 * Run: set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *      npx tsx scripts/verify-console-mapping.ts
 */
import { mapObligations, mapControls, type ObligationDbRow, type ControlDbRow, type PlaybookDbRow } from '../src/lib/console-data'
import { OBLIGATION_STATUS, SEVERITY } from '../src/components/ledger/status'

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'nedkrxjwmyhabrsscyem'
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const r = await fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const text = await r.text()
  const j = JSON.parse(text)
  if (!Array.isArray(j)) throw new Error(`query failed: ${text.slice(0, 300)}`)
  return j as T[]
}

const results: { name: string; pass: boolean }[] = []
const check = (name: string, pass: boolean, detail?: string) => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

async function main() {
  const NOW = '2026-06-24T00:00:00Z' // fixed for deterministic overdue
  const [{ id: orgId }] = await sql<{ id: string }>(`select id from organizations where name='דיפו'`)

  const obRows = await sql<ObligationDbRow>(
    `select title, status, severity, source_rule_id, source_version, recurs_at from obligations where org_id='${orgId}' order by severity`,
  )
  const ctRows = await sql<ControlDbRow>(
    `select source_playbook_id, source_playbook_version, cadence, next_due_at, owner_role, status from controls where org_id='${orgId}'`,
  )
  const pbRows = await sql<PlaybookDbRow>(`select template_id, version, name from hub_control_playbooks`)

  const obligations = mapObligations(obRows)
  const controls = mapControls(ctRows, pbRows, NOW)

  check('4 obligations mapped', obligations.length === 4, `${obligations.length}`)
  check('every obligation status is a known status', obligations.every((o) => !!OBLIGATION_STATUS[o.status]))
  check('every obligation severity is known (or null)', obligations.every((o) => o.severity == null || !!SEVERITY[o.severity]))
  check('every obligation has provenance (sourceRuleId)', obligations.every((o) => !!o.sourceRuleId))
  // colour mapping for the actual statuses present
  for (const o of obligations) {
    const v = OBLIGATION_STATUS[o.status].variant
    const sv = o.severity ? SEVERITY[o.severity].variant : '-'
    console.log(`   - "${o.title.slice(0, 28)}..." status=${o.status}->${v} severity=${o.severity ?? '-'}->${sv}`)
  }

  check('3 controls mapped', controls.length === 3, `${controls.length}`)
  check('every control resolved a real playbook name', controls.every((c) => c.name !== 'בקרה' && c.name.length > 0))
  check('every control cadence annual', controls.every((c) => c.cadence === 'annual'))
  check('no control overdue (next_due 2027 > now 2026)', controls.every((c) => c.overdue === false))
  controls.forEach((c) => console.log(`   - "${c.name}" cadence=${c.cadence} due=${c.nextDueAt} owner=${c.ownerRole} status=${c.status}`))

  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  if (failed) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
