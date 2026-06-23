/* Evaluator dry-run (B2). READ-ONLY: computes which obligations the deterministic
 * evaluator WOULD mint for each live org, against the provisional seed rules, and
 * prints the diff vs the current (empty) obligations table. Writes nothing.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/evaluator-dryrun.ts
 */
import { buildFacts, type ProcessingActivityRow, type V3Answers } from '../src/lib/ledger/facts'
import { evaluateRules } from '../src/lib/ledger/evaluator'
import { seedGapRules } from '../src/lib/ledger/seed-rules'

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'nedkrxjwmyhabrsscyem'
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN not set (source it from .env.local).')
  process.exit(1)
}

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const text = await r.text()
  const json = JSON.parse(text)
  if (!Array.isArray(json)) throw new Error(`query failed: ${text.slice(0, 300)}`)
  return json as T[]
}

async function main() {
  const orgs = await sql<{ id: string; name: string; v3: V3Answers | null }>(
    `select o.id, o.name, op.profile_data->'v3Answers' as v3
     from organizations o
     left join organization_profiles op on op.org_id = o.id
     order by o.name`,
  )
  const pas = await sql<ProcessingActivityRow & { org_id: string }>(
    `select org_id, special_categories, includes_minors, international_transfers,
            requires_dpia, requires_ppa_registration, security_level
     from processing_activities`,
  )
  const existing = await sql<{ org_id: string; n: number }>(
    `select org_id, count(*)::int as n from obligations group by org_id`,
  )
  const existingByOrg = new Map(existing.map((e) => [e.org_id, e.n]))

  console.log(`Seed rules: ${seedGapRules.length} (provisional). Orgs: ${orgs.length}. Obligations live now: ${existing.reduce((s, e) => s + e.n, 0)}\n`)

  let grandTotal = 0
  for (const org of orgs) {
    const orgPas = pas.filter((p) => p.org_id === org.id)
    const facts = buildFacts({ v3Answers: org.v3, processingActivities: orgPas })
    const result = evaluateRules(org.id, facts, seedGapRules)
    grandTotal += result.fired.length

    console.log(`========================================================`)
    console.log(`ORG: ${org.name}  (${org.id})`)
    console.log(`  facts: industry=${facts.industry} databases=${JSON.stringify(facts.databases)} totalRecords=${facts.totalRecords} maxAccess=${facts.maxAccess} securityLevel=${facts.securityLevel}`)
    console.log(`         hasMedical=${facts.hasMedical} hasCameras=${facts.hasCameras} hasWebLeads=${facts.hasWebLeads} hasConsent=${facts.hasConsent} accessControl=${facts.accessControl} processorCount=${facts.processorCount}`)
    console.log(`         procActivities=${facts.processingActivityCount} anyRequiresDpia=${facts.anyRequiresDpia} anyRequiresPpa=${facts.anyRequiresPpa}`)
    console.log(`  obligations now: ${existingByOrg.get(org.id) ?? 0}  ->  would-be after dry-run: ${result.fired.length}  (diff +${result.fired.length})`)
    if (result.fired.length) {
      console.log(`  WOULD MINT:`)
      for (const o of result.fired) console.log(`    [${o.severity}] ${o.title}  (rule ${o.sourceRuleId} v${o.sourceVersion}, status=${o.status})`)
    }
    if (result.errors.length) {
      console.log(`  RULE ERRORS (would NOT mint):`)
      for (const e of result.errors) console.log(`    rule ${e.templateId} v${e.version}: ${e.error}`)
    }
    console.log('')
  }

  console.log(`========================================================`)
  console.log(`TOTAL obligations that WOULD be minted across ${orgs.length} orgs: ${grandTotal}`)
  console.log(`(dry-run only - nothing was written)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
