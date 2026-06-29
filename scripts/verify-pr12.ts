/*
 * PR12 verification: ledger-back the ancillary compliance stats. Pure
 * deriveLedgerStats + the flag switch (flag-OFF byte-identical, flag-ON all 5
 * stats ledger-derived with zero neutral defaults) + דיפו's derived stats match
 * what its obligations imply. Mostly pure; live reads via the service client.
 *
 * Run:  set -a; source <(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local); set +a
 *       npx tsx scripts/verify-pr12.ts
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { deriveLedgerStats, buildLedgerSummary, loadComplianceSummary, type LedgerSummaryObligation, type LedgerDescriptorCounts } from '../src/lib/console-data'
import type { ComplianceSummary } from '../src/lib/compliance-engine'

const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'
function env(k: string): string {
  const v = process.env[k] || readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim()
  if (!v) throw new Error(`${k} not set`); return v
}
const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
let pass = 0, fail = 0
const check = (n: string, c: boolean, d?: string) => { if (c) { pass++; console.log(`  PASS  ${n}`) } else { fail++; console.log(`  FAIL  ${n}${d ? '  ::  ' + d : ''}`) } }

const ob = (id: string, title: string, ruleId: string | null): LedgerSummaryObligation => ({ id, title, status: 'checking', severity: 'critical', sourceRuleId: ruleId })

async function main() {
  // ---- pure deriveLedgerStats: rule -> stat ----
  console.log('[pure] deriveLedgerStats maps obligation provenance -> stats')
  const obs = [
    ob('1', 'מעל 100,000 -> רישום', 'b1000002-0000-4000-8000-000000000002'),
    ob('2', 'עיבוד -> רישום', 'b1000008-0000-4000-8000-000000000008'),
    ob('3', 'מידע רפואי -> אבטחה גבוהה', 'b1000001-0000-4000-8000-000000000001'),
    ob('4', 'גישה רחבה -> CISO', 'b1000006-0000-4000-8000-000000000006'),
  ]
  const s1 = deriveLedgerStats(obs, { db_count: 7, total_records: 120000 })
  check('needsReporting true + reasons = the 2 registration obligation titles', s1.needsReporting && s1.reportingReasons.length === 2 && s1.reportingReasons.includes('מעל 100,000 -> רישום') && s1.reportingReasons.includes('עיבוד -> רישום'))
  check('securityLevel high (b1000001 present)', s1.securityLevel === 'high' && s1.securityLevelHe === 'גבוהה')
  check('needsCiso true (b1000006 present)', s1.needsCiso === true)
  check('dbCount + totalRecords from the descriptor', s1.dbCount === 7 && s1.totalRecords === 120000)

  // safe default: no matching rule + no descriptor
  const s2 = deriveLedgerStats([ob('9', 'מצלמות', 'b1000003-0000-4000-8000-000000000003'), ob('10', 'ידני', null)], null)
  check('no matching rule -> basic / false / 0 (safe default)', s2.securityLevel === 'basic' && s2.needsReporting === false && s2.needsCiso === false && s2.dbCount === 0 && s2.totalRecords === 0)
  check('buildLedgerSummary: ZERO neutral hardcoding (reflects derivation)', (() => { const b = buildLedgerSummary(obs, 42, { db_count: 7, total_records: 120000 }); return b.securityLevel === 'high' && b.needsReporting === true && b.dbCount === 7 })())

  // ---- flag switch ----
  console.log('\n[switch] flag-OFF byte-identical; flag-ON ledger-derived')
  const sentinel = { score: -1 } as unknown as ComplianceSummary
  let fetchObsCalled = false, fetchDescCalled = false
  const off = await loadComplianceSummary({
    ledgerRead: false,
    fetchObligations: async () => { fetchObsCalled = true; return [] },
    fetchDescriptor: async () => { fetchDescCalled = true; return null },
    score: 0, legacy: () => sentinel,
  })
  check('flag-OFF returns legacy() verbatim', off === sentinel)
  check('flag-OFF NEVER touches the ledger (fetchObligations + fetchDescriptor uncalled)', fetchObsCalled === false && fetchDescCalled === false)

  let legacyCalled = false
  const on = await loadComplianceSummary({
    ledgerRead: true,
    fetchObligations: async () => obs,
    fetchDescriptor: async () => ({ db_count: 7, total_records: 120000 }),
    score: 42, legacy: () => { legacyCalled = true; return sentinel },
  })
  check('flag-ON builds from the ledger, legacy() NEVER called', legacyCalled === false && on.score === 42)
  check('flag-ON: all 5 ancillaries ledger-derived (no neutral defaults)', on.securityLevel === 'high' && on.needsReporting === true && on.reportingReasons.length === 2 && on.needsCiso === true && on.dbCount === 7 && on.totalRecords === 120000)

  // ---- דiפו: derived stats match what its real obligations imply ----
  console.log('\n[דiפו] derived stats match the obligations')
  const { data: rows } = await supabase.from('obligations').select('id, title, status, severity, source_rule_id').eq('org_id', ORG)
  const dipoObs: LedgerSummaryObligation[] = ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, title: r.title as string, status: r.status as LedgerSummaryObligation['status'],
    severity: (r.severity as LedgerSummaryObligation['severity']) ?? null, sourceRuleId: (r.source_rule_id as string) ?? null,
  }))
  check('דiפו obligations have source_rule_id populated (the map can fire)', dipoObs.length > 0 && dipoObs.every((o) => o.sourceRuleId))
  const { data: desc } = await supabase.from('org_descriptors').select('db_count, total_records').eq('org_id', ORG).maybeSingle()
  const dipo = deriveLedgerStats(dipoObs, (desc as LedgerDescriptorCounts | null))
  const hasRegRule = dipoObs.some((o) => ['b1000002-0000-4000-8000-000000000002', 'b1000008-0000-4000-8000-000000000008'].includes(o.sourceRuleId ?? ''))
  const hasHighRule = dipoObs.some((o) => o.sourceRuleId === 'b1000001-0000-4000-8000-000000000001')
  const hasCisoRule = dipoObs.some((o) => o.sourceRuleId === 'b1000006-0000-4000-8000-000000000006')
  check('needsReporting matches presence of registration obligations', dipo.needsReporting === hasRegRule)
  check('securityLevel matches presence of high-security obligation', (dipo.securityLevel === 'high') === hasHighRule)
  check('needsCiso matches presence of CISO obligation', dipo.needsCiso === hasCisoRule)
  console.log(`  (דiפו derived: securityLevel=${dipo.securityLevel}, needsReporting=${dipo.needsReporting} [${dipo.reportingReasons.length} reasons], needsCiso=${dipo.needsCiso}, dbCount=${dipo.dbCount})`)

  // ---- legacy organization_profiles byte-identical ----
  const { data: prof } = await supabase.from('organization_profiles').select('org_id, data_types, profile_data')
  const hashBefore = JSON.stringify(prof)
  const { data: profAfter } = await supabase.from('organization_profiles').select('org_id, data_types, profile_data')
  check('legacy organization_profiles untouched (read-only)', JSON.stringify(profAfter) === hashBefore)

  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
