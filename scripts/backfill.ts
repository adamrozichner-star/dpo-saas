/* D1 backfill - the canonical all-org ledger runner. Runs the EXISTING evaluator
 * (B2) + control instantiation (B3) over every org with v3Answers, idempotently,
 * so the ledger is canonical. Reuses the pure functions verbatim - no new
 * inference. Reads the live catalog (does not re-seed). Does NOT flip any
 * LEDGER_READ flag (data only). Operator batch job via the Management API; the
 * minted rows are identical to what the authed evaluator would produce. Runtime
 * per-user reads stay RLS-scoped.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/backfill.ts            # dry-run (default), writes nothing
 *       npx tsx scripts/backfill.ts --apply    # writes (idempotent)
 */
import { buildFacts, type V3Answers, type ProcessingActivityRow } from '../src/lib/ledger/facts'
import { evaluateRules, type GapRuleInput, type GapSeverity } from '../src/lib/ledger/evaluator'
import { buildObligationUpsertSql } from '../src/lib/ledger/persist'
import { planControls, buildControlUpsertSql, buildObligationLinkSql, type PlaybookInput, type ControlCadence } from '../src/lib/ledger/controls'
import { ruleToPlaybook } from '../src/lib/ledger/seed-playbooks'

const APPLY = process.argv.includes('--apply')
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'nedkrxjwmyhabrsscyem'
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const r = await fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const text = await r.text()
  const j = JSON.parse(text)
  if (!Array.isArray(j)) throw new Error(`query failed: ${text.slice(0, 400)}`)
  return j as T[]
}

async function main() {
  console.log(APPLY ? '=== BACKFILL APPLY (writing, idempotent) ===' : '=== BACKFILL DRY-RUN (writes nothing) ===')
  const appliedAt = new Date()

  // Live catalog (do not re-seed): active gap rules + control playbooks.
  const rules = (await sql<{ template_id: string; version: number; name: string; description: string; severity: GapSeverity; asset_template_id: string; rule_dsl: unknown }>(
    `select template_id, version, name, description, severity, asset_template_id, rule_dsl from hub_gap_rules where active`,
  )).map<GapRuleInput>((r) => ({ templateId: r.template_id, version: r.version, name: r.name, description: r.description, severity: r.severity, assetTemplateId: r.asset_template_id, ruleDsl: r.rule_dsl }))
  const playbooks = (await sql<{ template_id: string; version: number; asset_template_id: string; name: string; description: string; cadence: ControlCadence; owner_role: string | null; checklist: unknown[] }>(
    `select template_id, version, asset_template_id, name, description, cadence, owner_role, checklist from hub_control_playbooks where active`,
  )).map<PlaybookInput>((p) => ({ templateId: p.template_id, version: p.version, assetTemplateId: p.asset_template_id, name: p.name, description: p.description, cadence: p.cadence, ownerRole: p.owner_role, checklist: p.checklist ?? [] }))
  console.log(`live catalog: ${rules.length} active gap rules, ${playbooks.length} active playbooks\n`)

  const orgs = await sql<{ id: string; name: string; v3: V3Answers | null }>(
    `select o.id, o.name, op.profile_data->'v3Answers' as v3 from organizations o left join organization_profiles op on op.org_id = o.id order by o.name`,
  )
  const pas = await sql<ProcessingActivityRow & { org_id: string }>(
    `select org_id, special_categories, includes_minors, international_transfers, requires_dpia, requires_ppa_registration, security_level from processing_activities`,
  )

  let totalObMint = 0
  let totalCtrl = 0
  let skipped = 0

  for (const org of orgs) {
    if (!org.v3 || Object.keys(org.v3).length === 0) {
      console.log(`SKIP  ${org.name}  (no v3Answers)`)
      skipped++
      continue
    }
    const facts = buildFacts({ v3Answers: org.v3, processingActivities: pas.filter((p) => p.org_id === org.id) })
    const specs = evaluateRules(org.id, facts, rules).fired
    const plans = planControls(org.id, specs.map((s) => ({ sourceRuleId: s.sourceRuleId })), playbooks, ruleToPlaybook, appliedAt)

    const [{ n: obNow }] = await sql<{ n: number }>(`select count(*)::int as n from obligations where org_id='${org.id}'`)
    const [{ n: ctNow }] = await sql<{ n: number }>(`select count(*)::int as n from controls where org_id='${org.id}'`)
    totalObMint += specs.length
    totalCtrl += plans.length

    console.log(`ORG   ${org.name}`)
    console.log(`        obligations: now ${obNow} -> would-be ${specs.length} (diff +${Math.max(0, specs.length - obNow)})`)
    console.log(`        controls:    now ${ctNow} -> would-be ${plans.length} (diff +${Math.max(0, plans.length - ctNow)})`)

    if (APPLY && specs.length) {
      await sql(buildObligationUpsertSql(specs))
      const returned = await sql<{ id: string; source_playbook_id: string; source_playbook_version: number; next_due_at: string }>(buildControlUpsertSql(plans))
      for (const row of returned) {
        const plan = plans.find((p) => p.playbookTemplateId === row.source_playbook_id && p.playbookVersion === row.source_playbook_version)
        if (plan) await sql(buildObligationLinkSql(org.id, row.id, plan.ruleTemplateIds, new Date(row.next_due_at).toISOString()))
      }
    }
  }

  console.log(`\n${APPLY ? 'APPLIED' : 'DRY-RUN'}: ${orgs.length - skipped} orgs processed, ${skipped} skipped. Would-mint totals: obligations=${totalObMint}, controls=${totalCtrl}.`)
  console.log('No LEDGER_READ flags were changed.')
}

main().catch((e) => { console.error(e); process.exit(1) })
