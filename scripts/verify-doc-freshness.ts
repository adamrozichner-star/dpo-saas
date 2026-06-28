/*
 * F2b verification: proactive document freshness. The pure stale-selection +
 * the checkDocFreshnessForOrg orchestrator end-to-end (service-role client):
 * a drifted doc is flagged proactively via a notification; idempotent (no
 * double-flag); no false positive (a fresh doc is not flagged). Ephemeral
 * fixtures for דיפו; teardown in finally. Legacy untouched.
 *
 * Run:  set -a; source <(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local); set +a
 *       npx tsx scripts/verify-doc-freshness.ts
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { checkDocFreshnessForOrg, selectStaleDocIds } from '../src/lib/doc-freshness'
import { renderDocument, type RenderContext } from '../src/lib/ledger/doc-render'
import { seedDocumentTemplates } from '../src/lib/ledger/seed-document-templates'

const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'
function env(k: string): string {
  const v = process.env[k] || readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim()
  if (!v) throw new Error(`${k} not set`)
  return v
}
const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))

let pass = 0, fail = 0
const check = (n: string, c: boolean, d?: string) => { if (c) { pass++; console.log(`  PASS  ${n}`) } else { fail++; console.log(`  FAIL  ${n}${d ? '  ::  ' + d : ''}`) } }

const ROPA = seedDocumentTemplates.find((t) => t.docType === 'ropa')!

async function buildCtx(): Promise<RenderContext> {
  const [orgRes, dpoRes, profRes, assetRes, recipRes] = await Promise.all([
    supabase.from('organizations').select('name').eq('id', ORG).single(),
    supabase.from('contacts').select('name, email').eq('org_id', ORG).eq('role', 'dpo').limit(1),
    supabase.from('organization_profiles').select('data_types, processing_purposes, security_measures, third_parties').eq('org_id', ORG).maybeSingle(),
    supabase.from('assets').select('name, details').eq('org_id', ORG),
    supabase.from('data_recipients').select('name, has_dpa, dpa_signed_date, dpa_expiry_date').eq('org_id', ORG),
  ])
  const dpo = (dpoRes.data?.[0] as { name: string | null; email: string | null } | undefined) ?? null
  return {
    org: { name: (orgRes.data as { name: string }).name },
    dpo: dpo ? { name: dpo.name, email: dpo.email, license_number: null } : null,
    profile: (profRes.data as RenderContext['profile']) ?? null,
    assets: (assetRes.data ?? []) as RenderContext['assets'],
    recipients: (recipRes.data ?? []) as RenderContext['recipients'],
  }
}

async function main() {
  // ---- pure selectStaleDocIds ----
  console.log('[pure] selectStaleDocIds')
  const cur = new Map([['a', 'fp1'], ['b', 'fp2']])
  check('drifted doc selected (current != pinned)', JSON.stringify(selectStaleDocIds([{ id: 'a', pinned: 'OLD' }, { id: 'b', pinned: 'fp2' }], cur)) === JSON.stringify(['a']))
  check('fresh doc NOT selected (current == pinned) -> no false positive', selectStaleDocIds([{ id: 'b', pinned: 'fp2' }], cur).length === 0)
  check('doc with no current render NOT selected', selectStaleDocIds([{ id: 'z', pinned: 'x' }], cur).length === 0)

  let docId = ''
  try {
    const ctx = await buildCtx()
    const currentFp = renderDocument('ropa', { templateId: ROPA.templateId, version: 1, body: ROPA.body }, ctx).fingerprint

    // clear any pre-existing stale notifications for a clean baseline
    await supabase.from('notifications').delete().eq('org_id', ORG).eq('type', 'document_stale')

    // ---- a DRIFTED active doc (pinned fp != current) ----
    console.log('\n[orchestrator] drift -> proactive notification')
    const ins = await supabase.from('documents').insert({
      org_id: ORG, type: 'ropa', title: 'ROPA freshness test', content: '# x', status: 'active',
      version: 1, source: 'ledger_render', template_id: ROPA.templateId, template_version: 1,
      render_fingerprint: 'STALE_' + currentFp,
    }).select('id').single()
    docId = (ins.data as { id: string }).id

    const r1 = await checkDocFreshnessForOrg(ORG, supabase)
    check('drifted doc detected as stale', r1.stale >= 1, JSON.stringify(r1))
    check('a notification was raised proactively', r1.notified === true)
    const { data: notes1 } = await supabase.from('notifications').select('id, type, link').eq('org_id', ORG).eq('type', 'document_stale').is('read_at', null)
    check('one unread document_stale notification exists, linking to /console/documents', (notes1?.length ?? 0) === 1 && notes1![0].link === '/console/documents')

    // ---- idempotent: re-run does NOT double-flag ----
    console.log('\n[idempotent] re-run does not double-flag')
    const r2 = await checkDocFreshnessForOrg(ORG, supabase)
    check('re-run still sees the drift but does NOT notify again', r2.stale >= 1 && r2.notified === false)
    const { data: notes2 } = await supabase.from('notifications').select('id').eq('org_id', ORG).eq('type', 'document_stale').is('read_at', null)
    check('still exactly one unread notification (no duplicate)', (notes2?.length ?? 0) === 1)

    // ---- no false positive: re-approve (pin current fp) -> no longer flagged ----
    console.log('\n[no false positive] fresh doc is not flagged')
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('org_id', ORG).eq('type', 'document_stale')
    await supabase.from('documents').update({ render_fingerprint: currentFp }).eq('id', docId)
    const r3 = await checkDocFreshnessForOrg(ORG, supabase)
    check('a doc whose fingerprint matches current is NOT stale', r3.stale === 0 && r3.notified === false, JSON.stringify(r3))
    const { data: notes3 } = await supabase.from('notifications').select('id').eq('org_id', ORG).eq('type', 'document_stale').is('read_at', null)
    check('no new notification raised for a fresh doc', (notes3?.length ?? 0) === 0)

  } finally {
    console.log('\n[teardown]')
    if (docId) await supabase.from('documents').delete().eq('id', docId)
    await supabase.from('notifications').delete().eq('org_id', ORG).eq('type', 'document_stale')
    const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('org_id', ORG).eq('source', 'ledger_render')
    console.log(`  leftover ledger_render docs for דיפו: ${count ?? 0}`)
  }
  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
