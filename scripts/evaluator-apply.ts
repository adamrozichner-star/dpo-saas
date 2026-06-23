/* Evaluator apply (B2). Seeds the provisional gap rules, then runs the
 * deterministic evaluator over the live orgs and upserts obligations through the
 * persistence path. Double-runs the upsert to prove idempotency, then verifies.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/evaluator-apply.ts
 */
import { buildFacts, type ProcessingActivityRow, type V3Answers } from '../src/lib/ledger/facts'
import { evaluateRules, type GapRuleInput, type GapSeverity, type ObligationSpec } from '../src/lib/ledger/evaluator'
import { seedGapRules } from '../src/lib/ledger/seed-rules'
import { buildObligationUpsertSql } from '../src/lib/ledger/persist'

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'nedkrxjwmyhabrsscyem'
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const r = await fetch(URL, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const text = await r.text()
  const json = JSON.parse(text)
  if (!Array.isArray(json)) throw new Error(`query failed: ${text.slice(0, 400)}`)
  return json as T[]
}
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`

function buildSeedRuleUpsertSql(rules: GapRuleInput[]): string {
  // Provisional marker in-row: source_tier 'expert_judgment' + confidence 0.5,
  // reviewed_by left null. Authoritative provisional record is the seed file + lessons.md.
  const values = rules
    .map(
      (r) =>
        `  (${lit(r.templateId)}, ${r.version}, ${lit(r.assetTemplateId!)}, ${lit(r.name)}, ${lit(r.description)}, ${lit(r.severity)}, ${lit(JSON.stringify(r.ruleDsl))}::jsonb, true, 'expert_judgment'::hub_source_tier, 0.5)`,
    )
    .join(',\n')
  return `INSERT INTO public.hub_gap_rules
  (template_id, version, asset_template_id, name, description, severity, rule_dsl, active, source_tier, confidence)
VALUES
${values}
ON CONFLICT (template_id, version) DO UPDATE SET
  asset_template_id = EXCLUDED.asset_template_id,
  name = EXCLUDED.name, description = EXCLUDED.description, severity = EXCLUDED.severity,
  rule_dsl = EXCLUDED.rule_dsl, active = EXCLUDED.active,
  source_tier = EXCLUDED.source_tier, confidence = EXCLUDED.confidence, updated_at = now();`
}

async function computeSpecs(): Promise<ObligationSpec[]> {
  // Authentic path: read active rules back from the catalog.
  const rules = (
    await sql<{ template_id: string; version: number; name: string; description: string; severity: GapSeverity; asset_template_id: string; rule_dsl: unknown }>(
      `select template_id, version, name, description, severity, asset_template_id, rule_dsl from hub_gap_rules where active`,
    )
  ).map<GapRuleInput>((r) => ({ templateId: r.template_id, version: r.version, name: r.name, description: r.description, severity: r.severity, assetTemplateId: r.asset_template_id, ruleDsl: r.rule_dsl }))

  const orgs = await sql<{ id: string; name: string; v3: V3Answers | null }>(
    `select o.id, o.name, op.profile_data->'v3Answers' as v3 from organizations o left join organization_profiles op on op.org_id=o.id`,
  )
  const pas = await sql<ProcessingActivityRow & { org_id: string }>(
    `select org_id, special_categories, includes_minors, international_transfers, requires_dpia, requires_ppa_registration, security_level from processing_activities`,
  )
  const specs: ObligationSpec[] = []
  for (const org of orgs) {
    const facts = buildFacts({ v3Answers: org.v3, processingActivities: pas.filter((p) => p.org_id === org.id) })
    specs.push(...evaluateRules(org.id, facts, rules).fired)
  }
  return specs
}

async function upsertAndCount(specs: ObligationSpec[], label: string): Promise<number> {
  const stmt = buildObligationUpsertSql(specs)
  if (stmt) await sql(stmt)
  const [{ n }] = await sql<{ n: number }>(`select count(*)::int as n from obligations`)
  console.log(`${label}: upserted ${specs.length} specs -> obligations table now has ${n} rows`)
  return n
}

async function main() {
  console.log('=== seeding provisional gap rules ===')
  await sql(buildSeedRuleUpsertSql(seedGapRules))
  const [{ n: ruleCount }] = await sql<{ n: number }>(`select count(*)::int as n from hub_gap_rules where active`)
  console.log(`active hub_gap_rules now: ${ruleCount}\n`)

  const specs = await computeSpecs()
  console.log(`=== evaluator produced ${specs.length} obligation specs ===`)

  console.log('\n=== idempotency: upsert run twice ===')
  const n1 = await upsertAndCount(specs, 'PASS 1')
  const n2 = await upsertAndCount(specs, 'PASS 2')
  console.log(n1 === n2 && n1 === specs.length ? `IDEMPOTENT: stable at ${n1} rows across both runs` : `PROBLEM: n1=${n1} n2=${n2} specs=${specs.length}`)

  console.log('\n=== verify: obligation rows (provenance + status) ===')
  const rows = await sql(
    `select o.title, o.severity, o.status, o.source_rule_id, o.source_version, o.triggered_by, org.name as org
     from obligations o join organizations org on org.id=o.org_id
     order by o.severity, o.title`,
  )
  console.log(JSON.stringify(rows, null, 2))

  console.log('\n=== verify: relacl anon on obligations (MUST be empty) ===')
  const anon = await sql(
    `select pg_get_userbyid(a.grantee) as grantee, a.privilege_type
     from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     cross join lateral aclexplode(c.relacl) a
     where c.relname='obligations' and pg_get_userbyid(a.grantee)='anon'`,
  )
  console.log(anon.length === 0 ? 'anon has ZERO privileges on obligations (ok)' : JSON.stringify(anon))
}

main().catch((e) => { console.error(e); process.exit(1) })
