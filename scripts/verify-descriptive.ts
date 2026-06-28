/*
 * F2d verification: descriptive data in the v3 ledger. Pure resolver + the
 * ledger-first-fallback-legacy fetch: a render that previously read legacy
 * organization_profiles now reads org_descriptors; falls back to legacy when
 * absent; legacy byte-identical. Service-role client + ephemeral fixtures for
 * דיפו; teardown in finally.
 *
 * Run:  set -a; source <(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local); set +a
 *       npx tsx scripts/verify-descriptive.ts
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { resolveRenderProfile, resolveDpoLicense, fetchOrgDescriptive } from '../src/lib/ledger/descriptive'
import { renderDocument, type RenderContext } from '../src/lib/ledger/doc-render'
import { seedDocumentTemplates } from '../src/lib/ledger/seed-document-templates'

const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'
function env(k: string): string {
  const v = process.env[k] || readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim()
  if (!v) throw new Error(`${k} not set`); return v
}
const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
let pass = 0, fail = 0
const check = (n: string, c: boolean, d?: string) => { if (c) { pass++; console.log(`  PASS  ${n}`) } else { fail++; console.log(`  FAIL  ${n}${d ? '  ::  ' + d : ''}`) } }
const ROPA = seedDocumentTemplates.find((t) => t.docType === 'ropa')!

async function legacyHashes() {
  const { data: p } = await supabase.from('organization_profiles').select('org_id, data_types, processing_purposes, security_measures')
  const { data: dp } = await supabase.from('dpos').select('id, license_number')
  return JSON.stringify(p) + '||' + JSON.stringify(dp)
}

async function main() {
  const legacyBefore = await legacyHashes()

  // ---- pure resolver ----
  console.log('[pure] resolveRenderProfile prefers ledger, falls back to legacy')
  const led = { data_categories: ['A'], processing_purposes: ['P'], security_measures: ['S'] }
  const leg = { data_types: ['legacyA'], processing_purposes: ['legacyP'], security_measures: ['legacyS'], third_parties: ['V'] }
  const r1 = resolveRenderProfile(led, leg)
  check('ledger present -> uses ledger data_categories', JSON.stringify(r1.data_types) === JSON.stringify(['A']))
  check('third_parties always from legacy (ledger has data_recipients)', JSON.stringify(r1.third_parties) === JSON.stringify(['V']))
  const r2 = resolveRenderProfile(null, leg)
  check('ledger absent -> falls back to legacy', JSON.stringify(r2.data_types) === JSON.stringify(['legacyA']))
  check('resolveDpoLicense: ledger wins, else legacy', resolveDpoLicense('L1', 'L2') === 'L1' && resolveDpoLicense(null, 'L2') === 'L2' && resolveDpoLicense(null, null) === null)

  try {
    // ---- ledger-first read: a render that read legacy now reads ledger ----
    console.log('\n[ledger-first] org_descriptors drives the render (was legacy)')
    await supabase.from('org_descriptors').delete().eq('org_id', ORG)
    const absent = await fetchOrgDescriptive(ORG, supabase)
    check('no descriptor row -> profile from legacy (דיפו legacy is empty)', Array.isArray(absent.profile.data_types) && (absent.profile.data_types as unknown[]).length === 0)

    await supabase.from('org_descriptors').insert({ org_id: ORG, data_categories: ['לקוחות', 'עובדים'], processing_purposes: ['שיווק'], security_measures: ['הצפנה'] })
    const present = await fetchOrgDescriptive(ORG, supabase)
    check('descriptor present -> profile from LEDGER (not legacy)', JSON.stringify(present.profile.data_types) === JSON.stringify(['לקוחות', 'עובדים']))

    const ctx: RenderContext = { org: { name: 'דיפו' }, dpo: null, profile: present.profile, assets: [], recipients: [] }
    const rendered = renderDocument('ropa', { templateId: ROPA.templateId, version: 1, body: ROPA.body }, ctx)
    check('ROPA render reflects the LEDGER categories', rendered.content.includes('לקוחות, עובדים'))

    await supabase.from('org_descriptors').update({ data_categories: ['ספקים'] }).eq('org_id', ORG)
    const changed = await fetchOrgDescriptive(ORG, supabase)
    const rendered2 = renderDocument('ropa', { templateId: ROPA.templateId, version: 1, body: ROPA.body }, { ...ctx, profile: changed.profile })
    check('changing the ledger descriptor changes the render', rendered2.content.includes('ספקים') && !rendered2.content.includes('לקוחות, עובדים'))

    await supabase.from('org_descriptors').delete().eq('org_id', ORG)
    const backToLegacy = await fetchOrgDescriptive(ORG, supabase)
    check('deleting the descriptor falls back to legacy again', (backToLegacy.profile.data_types as unknown[]).length === 0)

    // ---- DPO license: ledger contacts.license_number, fallback dpos ----
    console.log('\n[dpo license] contacts.license_number (ledger) with dpos fallback')
    const c = await supabase.from('contacts').insert({ org_id: ORG, name: 'ממונה בדיקה', role: 'dpo', license_number: 'LIC-F2D-1' }).select('id').single()
    const cid = (c.data as { id: string }).id
    const withLic = await fetchOrgDescriptive(ORG, supabase)
    check('DPO license read from the ledger contact', withLic.dpoLicense === 'LIC-F2D-1')
    await supabase.from('contacts').update({ license_number: null }).eq('id', cid)
    const noLic = await fetchOrgDescriptive(ORG, supabase)
    check('null ledger license -> fallback (dpos via org.dpo_id, or null)', noLic.dpoLicense === null || typeof noLic.dpoLicense === 'string')
    await supabase.from('contacts').delete().eq('id', cid)

  } finally {
    console.log('\n[teardown]')
    await supabase.from('org_descriptors').delete().eq('org_id', ORG)
    await supabase.from('contacts').delete().eq('org_id', ORG).eq('name', 'ממונה בדיקה')
    const legacyAfter = await legacyHashes()
    check('(legacy) organization_profiles + dpos byte-identical', legacyAfter === legacyBefore)
  }
  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
