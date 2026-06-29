/*
 * F2c verification: bespoke docs (privacy_policy + security_procedures). AI is
 * NOT in the render path (source assertion); both docs render deterministically
 * from the approved template; placeholders render a clear marker; templates are
 * PROVISIONAL + not-for-customer; the F1 divergence flag + F2b freshness cover
 * them. Service-role client + ephemeral fixtures for דיפו; teardown in finally.
 *
 * Run:  set -a; source <(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local); set +a
 *       npx tsx scripts/verify-bespoke-docs.ts
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { renderDocument, DOC_TYPES, type RenderContext, type DocType } from '../src/lib/ledger/doc-render'
import { seedDocumentTemplates } from '../src/lib/ledger/seed-document-templates'
import { fetchOrgDescriptive } from '../src/lib/ledger/descriptive'
import { checkDocFreshnessForOrg } from '../src/lib/doc-freshness'

const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'
function env(k: string): string {
  const v = process.env[k] || readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim()
  if (!v) throw new Error(`${k} not set`); return v
}
const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
let pass = 0, fail = 0
const check = (n: string, c: boolean, d?: string) => { if (c) { pass++; console.log(`  PASS  ${n}`) } else { fail++; console.log(`  FAIL  ${n}${d ? '  ::  ' + d : ''}`) } }
const tpl = (dt: DocType) => { const s = seedDocumentTemplates.find((t) => t.docType === dt)!; return { templateId: s.templateId, version: s.version ?? 1, body: s.body } }

async function main() {
  // ---- AI is NOT in the render path (source assertion) ----
  console.log('[discipline] AI is not in the render path')
  const renderSrc = readFileSync(new URL('../src/lib/ledger/doc-render.ts', import.meta.url), 'utf8')
  check('doc-render.ts imports/calls no AI client', !/anthropic|openai|ai-doc-generator|@anthropic/i.test(renderSrc))
  check('privacy_policy + security_procedures are registered DocTypes', DOC_TYPES.includes('privacy_policy') && DOC_TYPES.includes('security_procedures'))

  const ctx = await fetchThenCtx()

  for (const dt of ['privacy_policy', 'security_procedures'] as DocType[]) {
    console.log(`\n[${dt}] deterministic render`)
    const r1 = renderDocument(dt, tpl(dt), ctx)
    const r2 = renderDocument(dt, tpl(dt), ctx)
    check(`${dt}: same ctx -> identical content + fingerprint`, r1.content === r2.content && r1.fingerprint === r2.fingerprint)
    check(`${dt}: renders for דיפו (org name substituted, no unfilled tokens)`, r1.content.includes('דיפו') && !r1.content.includes('{{'))
    check(`${dt}: not-for-customer marker present`, r1.content.includes('לא לשימוש לקוח'))
  }

  // ① v2: Roy-grounded PROVISIONAL prose replaced the legal placeholders in
  // privacy_policy (sections 4/7/9) + a DSAR intake path in section 8.
  const pp = renderDocument('privacy_policy', tpl('privacy_policy'), ctx)
  check('privacy_policy: template version bumped to 2', tpl('privacy_policy').version === 2)
  check('privacy_policy: NO legal placeholder left (prose is in)', !pp.content.includes('ממתין להשלמת רועי/אמיר'))
  check('privacy_policy §4: legal-basis prose (consent + legitimate activity)', pp.content.includes('הסכמת נושא המידע') && pp.content.includes('פעילותו העסקית השוטפת'))
  check('privacy_policy §7: per-purpose retention (principle + 7-year tax bucket)', pp.content.includes('אינה אחידה') && pp.content.includes('7 שנים'))
  check('privacy_policy §9: cross-border vendor-abroad framing', pp.content.includes('נעזר בספקי שירות') && pp.content.includes('מחוץ לישראל'))
  check('privacy_policy §8: DSAR intake path (how to file a request)', pp.content.includes('להגשת בקשה למימוש זכות'))
  // security_procedures still carries a legal placeholder (Amir, Thursday).
  check('security_procedures: still has the legal placeholder (held for Amir)', renderDocument('security_procedures', tpl('security_procedures'), ctx).content.includes('ממתין להשלמת רועי/אמיר'))

  // ---- fingerprint sensitivity (divergence flag covers them) ----
  console.log('\n[divergence] a ledger input change flips the fingerprint')
  const ctxB: RenderContext = { ...ctx, profile: { ...(ctx.profile ?? { data_types: [], processing_purposes: [], security_measures: [], third_parties: [] }), data_types: ['חדש'] } }
  check('privacy_policy fingerprint flips on data_categories change', renderDocument('privacy_policy', tpl('privacy_policy'), ctxB).fingerprint !== pp.fingerprint)
  const sp = renderDocument('security_procedures', tpl('security_procedures'), ctx)
  const ctxC: RenderContext = { ...ctx, profile: { ...(ctx.profile ?? { data_types: [], processing_purposes: [], security_measures: [], third_parties: [] }), security_measures: ['חומה'] } }
  check('security_procedures fingerprint flips on security_measures change', renderDocument('security_procedures', tpl('security_procedures'), ctxC).fingerprint !== sp.fingerprint)

  // ---- templates PROVISIONAL in the catalog ----
  console.log('\n[provisional] catalog rows')
  const { data: rows } = await supabase.from('hub_document_templates')
    .select('template_id, source_tier, confidence, reviewed_by, body')
    .in('template_id', [tpl('privacy_policy').templateId, tpl('security_procedures').templateId])
    .eq('active', true)
  check('both bespoke ACTIVE templates: expert_judgment / 0.5 / reviewed_by=null', (rows ?? []).length === 2 && (rows ?? []).every((r) => r.source_tier === 'expert_judgment' && r.confidence === 0.5 && r.reviewed_by === null))
  check('both bespoke template bodies carry the not-for-customer marker', (rows ?? []).every((r) => (r.body as string).includes('לא לשימוש לקוח')))

  // ① the live catalog reflects the v2 re-seed (active body has the prose).
  console.log('\n[live] privacy_policy active row is v2 with the new prose')
  const { data: livePp } = await supabase.from('hub_document_templates')
    .select('version, body').eq('template_id', tpl('privacy_policy').templateId).eq('active', true).single()
  check('live privacy_policy active version = 2', (livePp as { version: number } | null)?.version === 2)
  check('live privacy_policy body has Roy prose, no placeholder', !!livePp && (livePp.body as string).includes('להגשת בקשה למימוש זכות') && !(livePp.body as string).includes('ממתין להשלמת רועי/אמיר'))
  const { count: oldActive } = await supabase.from('hub_document_templates')
    .select('template_id', { count: 'exact', head: true }).eq('template_id', tpl('privacy_policy').templateId).eq('active', true)
  check('exactly one active privacy_policy row (v1 deactivated)', oldActive === 1)

  let docId = ''
  try {
    // ---- F2b freshness covers the new docs ----
    console.log('\n[freshness] F2b covers privacy_policy')
    await supabase.from('notifications').delete().eq('org_id', ORG).eq('type', 'document_stale')
    const ins = await supabase.from('documents').insert({
      org_id: ORG, type: 'privacy_policy', title: 'מדיניות פרטיות test', content: '# x', status: 'active',
      version: 1, source: 'ledger_render', template_id: tpl('privacy_policy').templateId, template_version: tpl('privacy_policy').version,
      render_fingerprint: 'STALE_' + pp.fingerprint,
    }).select('id').single()
    docId = (ins.data as { id: string }).id
    const res = await checkDocFreshnessForOrg(ORG, supabase)
    check('a stale privacy_policy doc is detected + notified by the F2b scan', res.stale >= 1 && res.notified === true)
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

async function fetchThenCtx(): Promise<RenderContext> {
  // set a known descriptor so the render has real content (cleaned up by F2d's row already; harmless)
  const desc = await fetchOrgDescriptive(ORG, supabase)
  const [orgRes, dpoRes, assetRes, recipRes] = await Promise.all([
    supabase.from('organizations').select('name').eq('id', ORG).single(),
    supabase.from('contacts').select('name, email').eq('org_id', ORG).eq('role', 'dpo').limit(1),
    supabase.from('assets').select('name, details').eq('org_id', ORG),
    supabase.from('data_recipients').select('name, has_dpa, dpa_signed_date, dpa_expiry_date').eq('org_id', ORG),
  ])
  const dpo = (dpoRes.data?.[0] as { name: string | null; email: string | null } | undefined) ?? null
  return {
    org: { name: (orgRes.data as { name: string }).name },
    dpo: dpo ? { name: dpo.name, email: dpo.email, license_number: desc.dpoLicense } : null,
    profile: desc.profile,
    assets: (assetRes.data ?? []) as RenderContext['assets'],
    recipients: (recipRes.data ?? []) as RenderContext['recipients'],
  }
}
main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
