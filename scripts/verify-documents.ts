/*
 * F1 verification: documents as ledger renders. Render purity + the divergence
 * lifecycle + RLS approval + the 19-legacy-rows safety gate. Live data via the
 * Management API with role-simulation (DPO / other-org). Pure render imported
 * from doc-render.ts. Ephemeral fixtures for דיפו; teardown in finally.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/verify-documents.ts
 */
import { renderDocument, DOC_TYPES, type RenderContext, type DocType } from '../src/lib/ledger/doc-render'
import { seedDocumentTemplates } from '../src/lib/ledger/seed-document-templates'

const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'       // דיפו
const DPO_SUB = 'ef4f98f3-11fe-43c1-83aa-dc2d6bb73dd5'   // expert_curator in דיפו
const OTHER_SUB = '3f29fa73-5578-4697-a705-872ed1515f90' // a user in a DIFFERENT org
const LEGACY_HASH = '5ac7e5ce969532a7272e5a8355219512'   // full-column hash of the 19 legacy rows
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

let pass = 0, fail = 0
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  ::  ' + detail : ''}`) }
}
async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok || (body && (body as { message?: string }).message)) throw new Error(`SQL: ${(body as { message?: string }).message || res.status}`)
  return body as T[]
}
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`
const asDpo = (s: string) => sql(`set local role authenticated; set local request.jwt.claims = '{"sub":"${DPO_SUB}","role":"authenticated"}'; ${s}`)
const asOther = (s: string) => sql(`set local role authenticated; set local request.jwt.claims = '{"sub":"${OTHER_SUB}","role":"authenticated"}'; ${s}`)
const legacyHash = async () => (await sql<{ h: string }>(`select md5(string_agg(id::text || '|' || type || '|' || coalesce(content,'') || '|' || coalesce(status,'') || '|' || coalesce(version::text,''), '~~' order by id)) h from public.documents where coalesce(source,'') <> 'ledger_render';`))[0].h
const bodyOf = (dt: DocType) => seedDocumentTemplates.find((t) => t.docType === dt)!
const tpl = (dt: DocType, version = 1) => { const s = bodyOf(dt); return { templateId: s.templateId, version, body: s.body } }

async function buildCtx(): Promise<RenderContext> {
  const org = (await sql<{ name: string }>(`select name from public.organizations where id=${lit(ORG)};`))[0]
  const dpo = (await sql<{ name: string | null; email: string | null }>(`select name, email from public.contacts where org_id=${lit(ORG)} and role='dpo' limit 1;`))[0] ?? null
  const prof = (await sql(`select data_types, processing_purposes, security_measures, third_parties from public.organization_profiles where org_id=${lit(ORG)} limit 1;`))[0] ?? null
  const assets = await sql(`select name, details from public.assets where org_id=${lit(ORG)};`)
  const recipients = await sql(`select name, has_dpa, dpa_signed_date::text, dpa_expiry_date::text from public.data_recipients where org_id=${lit(ORG)};`)
  return {
    org: { name: org.name },
    dpo: dpo ? { name: dpo.name, email: dpo.email, license_number: null } : null,
    profile: (prof as unknown as RenderContext['profile']) ?? null,
    assets: assets as unknown as RenderContext['assets'],
    recipients: recipients as unknown as RenderContext['recipients'],
  }
}

async function main() {
  const hashBefore = await legacyHash()
  check('(legacy) 19-row hash matches the captured baseline at start', hashBefore === LEGACY_HASH, hashBefore)

  // ---- render purity (pure JS, no DB) ----
  console.log('\n[purity] render is deterministic + fingerprint-sensitive')
  const ctxA: RenderContext = {
    org: { name: 'דיפו' }, dpo: { name: 'רוני', email: 'r@x.co', license_number: '123' },
    profile: { data_types: ['לקוחות'], processing_purposes: ['שיווק'], security_measures: ['הצפנה'], third_parties: [] },
    assets: [{ name: 'מאגר לקוחות', details: null }],
    recipients: [{ name: 'ספק א', has_dpa: false, dpa_signed_date: null, dpa_expiry_date: null }],
  }
  const r1 = renderDocument('processor_agreement', tpl('processor_agreement'), ctxA)
  const r2 = renderDocument('processor_agreement', tpl('processor_agreement'), ctxA)
  check('same ctx -> identical content', r1.content === r2.content)
  check('same ctx -> identical fingerprint', r1.fingerprint === r2.fingerprint)
  const ctxB: RenderContext = { ...ctxA, recipients: [{ name: 'ספק א', has_dpa: true, dpa_signed_date: '2026-01-01', dpa_expiry_date: '2027-01-01' }] }
  const r3 = renderDocument('processor_agreement', tpl('processor_agreement'), ctxB)
  check('changed ledger input (has_dpa) -> fingerprint flips', r3.fingerprint !== r1.fingerprint)
  const r4 = renderDocument('processor_agreement', tpl('processor_agreement', 2), ctxA)
  check('changed template version -> fingerprint flips', r4.fingerprint !== r1.fingerprint)

  // ---- 4 templates render for דiפו from real data ----
  console.log('\n[render] all 4 F1 templates render for דיפו')
  const ctx = await buildCtx()
  for (const dt of DOC_TYPES) {
    const r = renderDocument(dt, tpl(dt), ctx)
    check(`${dt} renders non-empty + org name substituted`, r.content.length > 20 && r.content.includes(ctx.org.name) && !r.content.includes('{{'))
  }

  let vendorId = ''
  try {
    // ---- RLS insert + cross-org ----
    console.log('\n[rls] v3 insert is org-scoped (cross-org denied)')
    const live = renderDocument('processor_agreement', tpl('processor_agreement'), ctx)
    const ins = await asDpo(`insert into public.documents (org_id, type, title, content, status, version, source, render_fingerprint, template_id, template_version) values (${lit(ORG)}, 'processor_agreement', 'DPA test', ${lit(live.content)}, 'pending_review', 1, 'ledger_render', ${lit(live.fingerprint)}, ${lit(tpl('processor_agreement').templateId)}, 1) returning id;`) as { id: string }[]
    check('DPO inserts a ledger_render doc under RLS', ins.length === 1)
    const docId = ins[0].id
    let crossDenied = false
    try { await asOther(`insert into public.documents (org_id, type, title, status, source) values (${lit(ORG)}, 'ropa', 'x', 'pending_review', 'ledger_render');`) }
    catch (e) { crossDenied = /row-level security|violates/i.test((e as Error).message) }
    check('cross-org INSERT into דיפו denied by RLS', crossDenied)

    // ---- approval lifecycle: pending_review -> active, pins ----
    console.log('\n[lifecycle] approve pins content + fingerprint + template_version')
    await asDpo(`update public.documents set status='active', render_fingerprint=${lit(live.fingerprint)}, template_version=1, approved_at=now() where id=${lit(docId)} and org_id=${lit(ORG)};`)
    const pinned = (await sql<{ status: string; content: string; render_fingerprint: string; template_version: number }>(`select status, content, render_fingerprint, template_version from public.documents where id=${lit(docId)};`))[0]
    check('doc is active + pinned (fingerprint + template_version)', pinned.status === 'active' && pinned.render_fingerprint === live.fingerprint && pinned.template_version === 1)

    // ---- divergence: mutate a ledger input the doc uses ----
    console.log('\n[divergence] ledger change -> needs-refresh; pinned content stable until re-approve')
    vendorId = (await sql<{ id: string }>(`insert into public.data_recipients (org_id, name, type, has_dpa, status) values (${lit(ORG)}, 'ספק רענון F1', 'processor', false, 'active') returning id;`))[0].id
    const ctx2 = await buildCtx()
    const live2 = renderDocument('processor_agreement', tpl('processor_agreement'), ctx2)
    check('new recipient changes the live render fingerprint', live2.fingerprint !== pinned.render_fingerprint)
    const stillPinned = (await sql<{ content: string; render_fingerprint: string }>(`select content, render_fingerprint from public.documents where id=${lit(docId)};`))[0]
    check('pinned content did NOT silently change', stillPinned.content === pinned.content && stillPinned.render_fingerprint === pinned.render_fingerprint)
    check('divergence detectable (live fp != pinned fp)', live2.fingerprint !== stillPinned.render_fingerprint)

    // ---- re-approve: re-pin new render ----
    await asDpo(`update public.documents set content=${lit(live2.content)}, render_fingerprint=${lit(live2.fingerprint)}, version=2, approved_at=now() where id=${lit(docId)} and org_id=${lit(ORG)};`)
    const rePinned = (await sql<{ content: string; render_fingerprint: string; version: number }>(`select content, render_fingerprint, version from public.documents where id=${lit(docId)};`))[0]
    check('re-approve pins the new render (content + fingerprint + version)', rePinned.render_fingerprint === live2.fingerprint && rePinned.content === live2.content && rePinned.version === 2)

    // ---- anon write-zero (re-assert relacl) ----
    console.log('\n[anon] zero write grants on documents')
    const anonW = (await sql<{ p: string | null }>(`select string_agg(privilege_type,',') p from information_schema.role_table_grants where table_name='documents' and grantee='anon' and privilege_type in ('INSERT','UPDATE','DELETE');`))[0].p
    check('anon has ZERO INSERT/UPDATE/DELETE on documents', anonW === null)

    // ---- templates PROVISIONAL ----
    // all seeded doc templates (F1's 4 + F2c's 2) must be PROVISIONAL: count
    // provisional == total active under the set, and at least the F1 four.
    const totalT = (await sql<{ n: number }>(`select count(*)::int n from public.hub_document_templates where asset_template_id='d0c00000-0000-4000-8000-000000000000' and active;`))[0].n
    const prov = (await sql<{ n: number }>(`select count(*)::int n from public.hub_document_templates where asset_template_id='d0c00000-0000-4000-8000-000000000000' and active and source_tier='expert_judgment' and confidence=0.5 and reviewed_by is null;`))[0].n
    check('all seeded doc templates are PROVISIONAL (expert_judgment/0.5, reviewed_by=null)', prov === totalT && prov >= 4, `provisional=${prov} total=${totalT}`)

  } finally {
    console.log('\n[teardown]')
    await sql(`delete from public.documents where org_id=${lit(ORG)} and source='ledger_render';`)
    if (vendorId) await sql(`delete from public.data_recipients where id=${lit(vendorId)};`)
    const hashAfter = await legacyHash()
    check('(legacy) 19-row hash byte-identical after the full F1 cycle', hashAfter === LEGACY_HASH, hashAfter)
    const strayV3 = (await sql<{ n: number }>(`select count(*)::int n from public.documents where org_id=${lit(ORG)} and source='ledger_render';`))[0].n
    console.log(`  leftover v3 render docs: ${strayV3}`)
  }

  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
