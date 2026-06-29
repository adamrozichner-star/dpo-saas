/* C1 mapping verification (credential-free). Reads דיפו's LIVE ledger rows via
 * the Management API and runs the SAME pure mapping the console uses, asserting
 * the real data maps to the right A4 view props + status.ts colors.
 *
 * Run: set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *      npx tsx scripts/verify-console-mapping.ts
 */
import {
  mapObligations,
  mapControls,
  mapObligationDetail,
  mapEvents,
  mapEvidence,
  mapRuleProvenance,
  type ObligationDbRow,
  type ControlDbRow,
  type PlaybookDbRow,
  type ObligationDetailDbRow,
  type EventDbRow,
  type EvidenceDbRow,
  type RuleDbRow,
  buildLedgerSummary,
  loadComplianceSummary,
  isLedgerRead,
  type LedgerSummaryObligation,
  buildOwnerHome,
  type OwnerObligationStatusRow,
  type OwnerTaskRow,
} from '../src/lib/console-data'
import { OBLIGATION_STATUS, SEVERITY } from '../src/components/ledger/status'
import { actorFromRole } from '../src/lib/actor'

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

  // ---- C2: obligation detail mappers against the real CCTV obligation ----
  console.log('\n-- C2 detail mappers (CCTV obligation) --')
  const [ob] = await sql<ObligationDetailDbRow>(
    `select id, title, status, severity, source_rule_id, source_version, recurs_at, description, triggered_by, opened_at, status_changed_at, closed_at, fulfilled_by_control_id
     from obligations where org_id='${orgId}' and source_rule_id='b1000003-0000-4000-8000-000000000003'`,
  )
  const detail = mapObligationDetail(ob)
  check('detail: mapped id + lifecycle', !!detail.id && detail.status === 'checking' && detail.severity === 'warning')
  check('detail: triggered_by + opened_at present', detail.triggeredBy === 'gap_rule' && !!detail.openedAt)
  check('detail: closed_at null (open obligation)', detail.closedAt === null)
  check('detail: linked control id present', !!detail.fulfilledByControlId)

  const evRows = await sql<EvidenceDbRow>(`select kind, document_id, answer_ref, captured_at, captured_via from evidence where obligation_id='${detail.id}'`)
  const evtRows = await sql<EventDbRow>(`select entity_type, event_type, actor, created_at, data from events where entity_type='obligation' and entity_id='${detail.id}'`)
  check('detail: evidence empty (none yet)', mapEvidence(evRows).length === 0, `${evRows.length}`)
  check('detail: events empty (none yet)', mapEvents(evtRows).length === 0, `${evtRows.length}`)

  const [rule] = await sql<RuleDbRow>(
    `select name, severity, source_tier, confidence, remediation_text from hub_gap_rules where template_id='${detail.sourceRuleId}' and version=${detail.sourceVersion}`,
  )
  const prov = mapRuleProvenance(rule)
  check('detail: rule provenance resolved', !!prov.name && prov.sourceTier === 'expert_judgment' && prov.sourceTierLabel === 'שיפוט מומחה', `tier=${prov.sourceTier} label=${prov.sourceTierLabel} conf=${prov.confidence}`)

  // ---- C4: LEDGER_READ flag bridge (pure switch + buildLedgerSummary) ----
  console.log('\n-- C4 LEDGER_READ flag (buildLedgerSummary + switch) --')
  check('isLedgerRead off for {} / on for {LEDGER_READ:true}', isLedgerRead({ feature_flags: {} }) === false && isLedgerRead({ feature_flags: { LEDGER_READ: true } }) === true)

  const ledgerObs = (await sql<LedgerSummaryObligation>(
    `select id, title, status, severity, description from obligations where org_id='${orgId}' order by severity`,
  )) as LedgerSummaryObligation[]
  const ledgerSummary = buildLedgerSummary(ledgerObs, 42)
  check('buildLedgerSummary: 4 ledger tasks, titles match /console rows', ledgerSummary.tasks.length === 4 && ledgerSummary.tasks.every((t) => t.title.length > 0))
  check('buildLedgerSummary: tasks are read-only (actionType doc_review)', ledgerSummary.tasks.every((t) => t.actionType === 'doc_review'))
  check('buildLedgerSummary: checking obligation -> needs_action task', ledgerSummary.tasks.every((t) => t.status === 'needs_action' || t.status === 'completed'))
  check('buildLedgerSummary: score 42; ancillaries safe-default with no source-rule/descriptor (PR12 derivation tested in verify-pr12)', ledgerSummary.score === 42 && ledgerSummary.securityLevel === 'basic' && ledgerSummary.needsReporting === false && ledgerSummary.dbCount === 0)

  const sentinel = buildLedgerSummary([], 99) // a distinct object to detect the legacy path
  let fetchCalled = false
  const off = await loadComplianceSummary({ ledgerRead: false, fetchObligations: async () => { fetchCalled = true; return [] }, score: 0, legacy: () => sentinel })
  check('flag OFF: returns legacy() verbatim, ledger NOT fetched', off === sentinel && fetchCalled === false)

  let legacyCalled = false
  const on = await loadComplianceSummary({ ledgerRead: true, fetchObligations: async () => ledgerObs, score: 42, legacy: () => { legacyCalled = true; return sentinel } })
  check('flag ON: builds from ledger (4 tasks, score 42), legacy NOT called', on.tasks.length === 4 && on.score === 42 && legacyCalled === false)

  const flags = await sql<{ name: string; ledger: boolean }>(
    `select name, coalesce((feature_flags->>'LEDGER_READ')::boolean, false) as ledger from organizations order by name`,
  )
  check('live flags: דיפו on, others off (legacy)', flags.find((f) => f.name === 'דיפו')?.ledger === true && flags.filter((f) => f.name !== 'דיפו').every((f) => f.ledger === false), JSON.stringify(flags))

  // ---- D2: owner home mapper (plain language, no jargon leak) ----
  console.log('\n-- D2 owner home (buildOwnerHome) --')
  check('actorFromRole: admin -> owner, expert_curator -> dpo', actorFromRole('admin') === 'owner' && actorFromRole('expert_curator') === 'dpo')

  const ownerObs = (await sql<OwnerObligationStatusRow>(`select status from obligations where org_id='${orgId}'`)) as OwnerObligationStatusRow[]
  const ownerTasks = (await sql<OwnerTaskRow>(`select title from tasks where org_id='${orgId}' and assignee_actor='owner' and status not in ('done','cancelled')`)) as OwnerTaskRow[]
  const owner = buildOwnerHome(ownerObs, ownerTasks)
  check('owner home: handlingCount 4, needsYou empty, allClear', owner.handlingCount === 4 && owner.needsYou.length === 0 && owner.allClear === true, `handling=${owner.handlingCount} needsYou=${owner.needsYou.length}`)

  const ownerCopy = `${owner.headline} ${owner.reassurance} ${owner.humanTouch}`
  const jargon = /רישום מאגר|מצלמות|הסכם עיבוד|קריטי|אזהרה|כלל |b1000|source_rule|severity|provenance|מערכות|רשומות/
  check('owner copy leaks NO obligation title / severity / provenance / banned terms', !jargon.test(ownerCopy), ownerCopy)
  check('owner copy uses Deepo (capital D), warm reassurance', /Deepo/.test(owner.reassurance) && owner.headline.length > 0 && owner.humanTouch.length > 0)

  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  if (failed) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
