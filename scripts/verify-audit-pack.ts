/*
 * F2a verification: Certify / audit pack. buildAuditPack purity + full coverage +
 * provenance traces + reproducible fingerprint + snapshot immutability + RLS +
 * PII-free + legacy byte-identical. Live data via the Management API with
 * role-simulation (DPO / other-org). Ephemeral fixtures for דיפו; teardown in finally.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/verify-audit-pack.ts
 */
import { buildAuditPack, type AuditPackInput, type AuditObligation, type AuditDoc } from '../src/lib/ledger/audit-pack'

const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'
const DPO_SUB = 'ef4f98f3-11fe-43c1-83aa-dc2d6bb73dd5'
const OTHER_SUB = '3f29fa73-5578-4697-a705-872ed1515f90'
const LEGACY_DOCS_HASH = '5ac7e5ce969532a7272e5a8355219512'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

let pass = 0, fail = 0
const check = (n: string, c: boolean, d?: string) => { if (c) { pass++; console.log(`  PASS  ${n}`) } else { fail++; console.log(`  FAIL  ${n}${d ? '  ::  ' + d : ''}`) } }
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
const legacyDocsHash = async () => (await sql<{ h: string }>(`select md5(string_agg(id::text||'|'||type||'|'||coalesce(content,'')||'|'||coalesce(status,'')||'|'||coalesce(version::text,''), '~~' order by id)) h from public.documents where coalesce(source,'') <> 'ledger_render';`))[0].h
const profileHash = async () => (await sql<{ h: string }>(`select coalesce(md5(string_agg(id::text||coalesce(profile_data::text,''), '~~' order by id)),'(empty)') h from public.organization_profiles;`))[0].h

async function buildLiveInput(generatedAtIso: string): Promise<AuditPackInput> {
  const org = (await sql<{ name: string; compliance_score: number | null; business_id: string | null }>(`select name, compliance_score, business_id from public.organizations where id=${lit(ORG)};`))[0]
  const desc = (await sql<{ address: string | null }>(`select address from public.org_descriptors where org_id=${lit(ORG)};`))[0]
  const obRows = await sql<Record<string, unknown>>(`select id, title, status, severity, source_rule_id, source_version, status_changed_at, fulfilled_by_control_id from public.obligations where org_id=${lit(ORG)};`)
  const evRows = await sql<{ obligation_id: string; kind: string; captured_at: string | null; captured_via: string | null; answer_ref: string | null }>(`select obligation_id, kind, captured_at::text, captured_via, answer_ref from public.evidence where org_id=${lit(ORG)};`)
  const ctRows = await sql<{ id: string; cadence: string; next_due_at: string | null; last_completed_at: string | null }>(`select id, cadence, next_due_at::text, last_completed_at::text from public.controls where org_id=${lit(ORG)};`)
  const docRows = await sql<Record<string, unknown>>(`select type, title, version, approved_at::text, render_fingerprint from public.documents where org_id=${lit(ORG)} and source='ledger_render' and status='active';`)
  const evByOb = new Map<string, AuditObligation['evidence']>()
  for (const e of evRows) { const a = evByOb.get(e.obligation_id) ?? []; a.push({ kind: e.kind, capturedAt: e.captured_at, capturedVia: e.captured_via, ref: e.answer_ref }); evByOb.set(e.obligation_id, a) }
  const ctById = new Map(ctRows.map((c) => [c.id, { name: 'בקרה', cadence: c.cadence, nextDueAt: c.next_due_at, lastCompletedAt: c.last_completed_at }]))
  const obligations: AuditObligation[] = obRows.map((o) => ({
    id: o.id as string, title: o.title as string, status: o.status as AuditObligation['status'], severity: (o.severity as AuditObligation['severity']) ?? null,
    sourceRuleId: (o.source_rule_id as string) ?? null, sourceVersion: (o.source_version as number) ?? null, statusChangedAt: (o.status_changed_at as string) ?? null,
    provenance: o.source_rule_id ? { name: 'rule', sourceTierLabel: null, confidence: null } : null,
    evidence: evByOb.get(o.id as string) ?? [],
    control: o.fulfilled_by_control_id ? ctById.get(o.fulfilled_by_control_id as string) ?? null : null,
  }))
  const documents: AuditDoc[] = docRows.map((x) => ({ type: x.type as string, title: x.title as string, version: (x.version as number) ?? null, approvedAt: (x.approved_at as string) ?? null, fingerprint: (x.render_fingerprint as string) ?? null }))
  return { org: { name: org.name, businessId: org.business_id ?? null, address: desc?.address ?? null }, score: org.compliance_score, dpoName: null, generatedAtIso, obligations, documents }
}

async function main() {
  const docHashBefore = await legacyDocsHash()
  const profHashBefore = await profileHash()
  check('(legacy) 19-doc hash matches baseline at start', docHashBefore === LEGACY_DOCS_HASH, docHashBefore)

  // ---- purity (pure JS) ----
  console.log('\n[purity] buildAuditPack deterministic + fingerprint-sensitive')
  const baseOb: AuditObligation = { id: 'o1', title: 'חובה', status: 'checking', severity: 'critical', sourceRuleId: 'r1', sourceVersion: 1, statusChangedAt: null, provenance: { name: 'כלל', sourceTierLabel: 'חוק', confidence: 0.9 }, evidence: [{ kind: 'answer', capturedAt: '2026-01-01', capturedVia: 'access_link', ref: 'ev1' }], control: { name: 'c', cadence: 'annual', nextDueAt: '2027-01-01', lastCompletedAt: null } }
  const inA: AuditPackInput = { org: { name: 'דיפו' }, score: 42, dpoName: 'רוני', generatedAtIso: '2026-06-01T00:00:00Z', obligations: [baseOb], documents: [{ type: 'ropa', title: 'ROPA', version: 1, approvedAt: '2026-05-01', fingerprint: 'abc' }] }
  const p1 = buildAuditPack(inA)
  const p2 = buildAuditPack({ ...inA, generatedAtIso: '2099-12-31T00:00:00Z' }) // different generated-at only
  check('same ledger state -> identical fingerprint (generated-at excluded)', p1.fingerprint === p2.fingerprint)
  check('same input -> identical content', buildAuditPack(inA).content === p1.content)
  const p3 = buildAuditPack({ ...inA, obligations: [{ ...baseOb, status: 'compliant' }] })
  check('changed obligation state -> fingerprint flips', p3.fingerprint !== p1.fingerprint)
  check('summary counts correct', p1.summary.obligations === 1 && p1.summary.evidence === 1 && p1.summary.controls === 1 && p1.summary.documents === 1)

  // ---- ② controller identity in the regulator-facing header ----
  console.log('\n[controller identity] name + business_id + address, placeholder when absent')
  const idIn: AuditPackInput = { ...inA, org: { name: 'דיפו', businessId: '54454446', address: 'רחוב הדוגמה 1, תל אביב' } }
  const idPack = buildAuditPack(idIn)
  check('header renders business_id + address when present', idPack.content.includes('54454446') && idPack.content.includes('רחוב הדוגמה 1, תל אביב'))
  check('header shows a clear missing-marker when identity absent', buildAuditPack(inA).content.includes('יש להשלים פרטי בעל המאגר'))
  check('controller identity is in the fingerprint (address change flips it)', buildAuditPack({ ...idIn, org: { ...idIn.org, address: 'אחרת 2' } }).fingerprint !== idPack.fingerprint)
  check('controller identity is in the fingerprint (business_id change flips it)', buildAuditPack({ ...idIn, org: { ...idIn.org, businessId: '99999999' } }).fingerprint !== idPack.fingerprint)

  let evId = '', docId = '', eventId = ''
  try {
    // ---- fixtures: an obligation-linked evidence (tracing to an event) + an active F1 doc ----
    console.log('\n[coverage] pack assembles obligations + evidence chain + controls + docs')
    const ob = (await sql<{ id: string; title: string }>(`select id, title from public.obligations where org_id=${lit(ORG)} order by severity limit 1;`))[0]
    eventId = (await sql<{ id: string }>(`insert into public.events (org_id, entity_type, entity_id, event_type, actor, data) values (${lit(ORG)}, 'obligation', ${lit(ob.id)}, 'evidence_captured', 'test', '{}'::jsonb) returning id;`))[0].id
    evId = (await sql<{ id: string }>(`insert into public.evidence (org_id, obligation_id, kind, answer_ref, captured_via) values (${lit(ORG)}, ${lit(ob.id)}, 'answer', ${lit(eventId)}, 'access_link') returning id;`))[0].id
    docId = (await sql<{ id: string }>(`insert into public.documents (org_id, type, title, content, status, version, source, render_fingerprint, approved_at) values (${lit(ORG)}, 'ropa', 'ROPA test', '# x', 'active', 3, 'ledger_render', 'fpdoc123', now()) returning id;`))[0].id

    const live = buildAuditPack(await buildLiveInput(new Date().toISOString()))
    check('pack covers every obligation', live.summary.obligations === (await sql<{ n: number }>(`select count(*)::int n from public.obligations where org_id=${lit(ORG)};`))[0].n)
    check('pack includes the fixture evidence chain (>=1 evidence)', live.summary.evidence >= 1)
    check('pack includes the active F1 doc', live.summary.documents >= 1 && live.content.includes('fpdoc123'))
    check('provenance: obligation title appears in the pack', live.content.includes(ob.title))
    check('evidence trace: the source event id (answer_ref) appears in the pack', live.content.includes(eventId))
    check('live header carries דיפו controller business_id (54454446)', live.content.includes('54454446'))

    // ---- reproducible: same ledger state -> same fingerprint ----
    const liveAgain = buildAuditPack(await buildLiveInput(new Date(Date.now() + 99999).toISOString()))
    check('reproducible: same ledger state -> same pack fingerprint', live.fingerprint === liveAgain.fingerprint)

    // ---- RLS + record + immutability ----
    console.log('\n[rls + immutability] record under RLS; cross-org denied; snapshot immutable')
    const rec = await asDpo(`insert into public.audit_packs (org_id, generated_by, pack_fingerprint, content, summary) values (${lit(ORG)}, ${lit(DPO_SUB)}, ${lit(live.fingerprint)}, ${lit(live.content)}, ${lit(JSON.stringify(live.summary))}::jsonb) returning id;`) as { id: string }[]
    check('DPO records a pack under RLS', rec.length === 1)
    const packId = rec[0].id
    let crossDenied = false
    try { await asOther(`insert into public.audit_packs (org_id, pack_fingerprint, content) values (${lit(ORG)}, 'x', 'y');`) } catch (e) { crossDenied = /row-level security|violates/i.test((e as Error).message) }
    check('cross-org pack INSERT denied by RLS', crossDenied)
    const recordedBefore = (await sql<{ content: string; fp: string }>(`select content, pack_fingerprint fp from public.audit_packs where id=${lit(packId)};`))[0]

    // mutate the ledger -> live fingerprint changes, recorded snapshot does NOT
    const ev2 = (await sql<{ id: string }>(`insert into public.evidence (org_id, obligation_id, kind, captured_via) values (${lit(ORG)}, ${lit(ob.id)}, 'attestation', 'access_link') returning id;`))[0].id
    const liveAfter = buildAuditPack(await buildLiveInput(new Date().toISOString()))
    check('ledger change -> live pack fingerprint drifts', liveAfter.fingerprint !== live.fingerprint)
    const recordedAfter = (await sql<{ content: string; fp: string }>(`select content, pack_fingerprint fp from public.audit_packs where id=${lit(packId)};`))[0]
    check('recorded snapshot IMMUTABLE (content + fingerprint unchanged after ledger moved)', recordedAfter.content === recordedBefore.content && recordedAfter.fp === recordedBefore.fp)
    // immutability: authenticated has NO UPDATE grant AND no UPDATE policy -> the
    // update is blocked (grant-level denial OR 0 rows). Either proves the pin holds.
    let immutable = false
    try {
      const upd = await asDpo(`with u as (update public.audit_packs set content='tampered' where id=${lit(packId)} returning id) select count(*)::int n from u;`) as { n: number }[]
      immutable = upd[0].n === 0
    } catch (e) { immutable = /permission denied|row-level security/i.test((e as Error).message) }
    check('a recorded pack cannot be rewritten (no UPDATE grant/policy)', immutable)
    await sql(`delete from public.evidence where id=${lit(ev2)};`)

    // ---- PII-free + anon zero ----
    console.log('\n[pii + anon]')
    const piiCols = await sql<{ c: string }>(`select column_name c from information_schema.columns where table_schema='public' and table_name='audit_packs' and (column_name ilike '%name%' or column_name ilike '%email%' or column_name ilike '%phone%' or column_name ilike '%requester%' or column_name ilike '%id_num%');`)
    check('audit_packs has no PII-capable column', piiCols.length === 0, piiCols.map((r) => r.c).join(','))
    const anon = (await sql<{ p: string | null }>(`select string_agg(privilege_type,',') p from information_schema.role_table_grants where table_name='audit_packs' and grantee='anon';`))[0].p
    check('anon has ZERO grant on audit_packs', anon === null)

  } finally {
    console.log('\n[teardown]')
    await sql(`delete from public.audit_packs where org_id=${lit(ORG)};`)
    if (evId) await sql(`delete from public.evidence where id=${lit(evId)};`)
    if (docId) await sql(`delete from public.documents where id=${lit(docId)};`)
    if (eventId) await sql(`delete from public.events where id=${lit(eventId)};`)
    const docHashAfter = await legacyDocsHash()
    const profHashAfter = await profileHash()
    check('(legacy) 19-doc hash byte-identical after F2a cycle', docHashAfter === LEGACY_DOCS_HASH, docHashAfter)
    check('(legacy) organization_profiles byte-identical', profHashAfter === profHashBefore)
    const stray = (await sql<{ n: number }>(`select count(*)::int n from public.audit_packs where org_id=${lit(ORG)};`))[0].n
    console.log(`  leftover audit_packs: ${stray}`)
  }
  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
