/*
 * E3 verification: the vendor DPA chase flow + the containment RE-PROOF (042
 * modifies the verified E1 primitive). Live data via the Management API, with
 * role-simulation for anon / DPO / other-org / the access_link_fn firewall role.
 * Ephemeral fixtures for org "דיפו"; the shared c1000003 control's next_due_at is
 * captured and RESTORED. Teardown runs in finally.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/verify-vendor-dpa.ts
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { VENDOR_DPA_QSET_ID, seedVendorDpaQuestions } from '../src/lib/ledger/seed-vendor-dpa-questions'
import { mapSubmissions, type EventDbRow } from '../src/lib/console-data'

const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'           // דיפו
const DPO_SUB = 'ef4f98f3-11fe-43c1-83aa-dc2d6bb73dd5'       // expert_curator in דיפו
const OTHER_ORG = 'be8c5dbe-52e4-470f-ac98-dd7caf6297d0'     // a DIFFERENT org
const REG15 = '61ceb268-7168-46e9-9cb9-c23f8b9097e0'         // Reg 15 DPA obligation (דיפו)
const PLAYBOOK = 'c1000003-0000-4000-8000-000000000003'      // annual vendor-DPA review
const XSS = '<script>alert(1)</script>'
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
const asAnon = (s: string) => sql(`set local role anon; ${s}`)
const asDpo = (s: string) => sql(`set local role authenticated; set local request.jwt.claims = '{"sub":"${DPO_SUB}","role":"authenticated"}'; ${s}`)
async function deniedAs(role: string, stmt: string): Promise<boolean> {
  try { await sql(`set local role ${role}; ${stmt}`); return false } catch (e) { return /permission denied/i.test((e as Error).message) }
}

async function main() {
  // capture the shared control's state for restore
  const c0 = await sql<{ next_due_at: string | null; last_completed_at: string | null; status: string }>(
    `select next_due_at, last_completed_at, status from public.controls where org_id=${lit(ORG)} and source_playbook_id=${lit(PLAYBOOK)};`)
  const hadControl = c0.length > 0
  const origNextDue = hadControl ? c0[0].next_due_at : null

  let vendorId = '', vendor2Id = '', otherVendorId = '', taskId = '', task2Id = '', tmpTaskId = ''
  try {
    // ---------------------------------------- 0. seed present (PROVISIONAL)
    console.log('\n[0] vendor-DPA attestation set seeded (PROVISIONAL)')
    const qn = await sql<{ n: number }>(`select count(*)::int n from public.hub_questions where asset_template_id=${lit(VENDOR_DPA_QSET_ID)} and active and source_tier='expert_judgment' and confidence=0.5`)
    check(`${seedVendorDpaQuestions.length} active PROVISIONAL questions`, qn[0].n === seedVendorDpaQuestions.length, `live=${qn[0].n}`)

    // fixtures
    vendorId = (await sql<{ id: string }>(`insert into public.data_recipients (org_id, name, type, has_dpa, status, compliance_verified) values (${lit(ORG)}, 'ספק בדיקה E3', 'processor', false, 'active', false) returning id;`))[0].id
    vendor2Id = (await sql<{ id: string }>(`insert into public.data_recipients (org_id, name, type, has_dpa, status, compliance_verified) values (${lit(ORG)}, 'ספק בדיקה 2', 'processor', false, 'active', false) returning id;`))[0].id
    otherVendorId = (await sql<{ id: string }>(`insert into public.data_recipients (org_id, name, type, status) values (${lit(OTHER_ORG)}, 'ספק ארגון אחר', 'processor', 'active') returning id;`))[0].id

    // ============================= GRANT-LAYER RE-PROOF =============================
    console.log('\n[1] grant-layer firewall (042 must not have widened it)')
    check('access_link_fn STILL cannot SELECT organizations', await deniedAs('access_link_fn', 'select 1 from public.organizations limit 1;'))
    check('access_link_fn STILL cannot SELECT contacts', await deniedAs('access_link_fn', 'select 1 from public.contacts limit 1;'))
    check('access_link_fn STILL cannot SELECT obligations', await deniedAs('access_link_fn', 'select 1 from public.obligations limit 1;'))
    check('access_link_fn CANNOT UPDATE data_recipients.compliance_verified (column denial)',
      await deniedAs('access_link_fn', `update public.data_recipients set compliance_verified=true where id=${lit(vendorId)};`))
    check('access_link_fn CANNOT UPDATE data_recipients.status (column denial)',
      await deniedAs('access_link_fn', `update public.data_recipients set status='inactive' where id=${lit(vendorId)};`))
    check('access_link_fn CAN UPDATE the allowed DPA columns (no denial)',
      !(await deniedAs('access_link_fn', `update public.data_recipients set has_dpa=true, updated_at=now() where id=${lit(vendorId)};`)))

    // ----------------------------- mint org-ownership check
    console.log('\n[2] mint org-ownership check on the recipient')
    tmpTaskId = (await asDpo(`insert into public.tasks (org_id, obligation_id, assignee_actor, title, status) values (${lit(ORG)}, ${lit(REG15)}, 'vendor', 'tmp', 'open') returning id;`) as { id: string }[])[0].id
    let crossOrgRejected = false
    try {
      await asDpo(`select public.mint_access_link('vendor_dpa', ${lit(tmpTaskId)}, 'דיפו', ${lit(VENDOR_DPA_QSET_ID)}, now()+interval '21 days', ${lit(otherVendorId)});`)
    } catch (e) { crossOrgRejected = /recipient not found in caller org/.test((e as Error).message) }
    check('mint REJECTS a recipient from a different org', crossOrgRejected)

    // ============================= BACK-COMPAT (E2) =============================
    console.log('\n[3] back-compat: 5-arg sysadmin mint + sysadmin submit touches no vendor tables')
    const sysTask = (await asDpo(`insert into public.tasks (org_id, obligation_id, assignee_actor, title, status) values (${lit(ORG)}, ${lit(REG15)}, 'sysadmin', 'sys', 'open') returning id;`) as { id: string }[])[0].id
    const sysTok = (await asDpo(`select public.mint_access_link('sysadmin_questionnaire', ${lit(sysTask)}, 'דיפו', 'c5a00000-0000-4000-8000-000000000001', now()+interval '14 days') as token;`) as { token: string }[])[0].token
    check('E2 5-arg mint still resolves (defaulted 6th arg)', /^[0-9a-f]{64}$/.test(sysTok || ''))
    // snapshot the specific vendor's updated_at + the control's next_due_at, then
    // assert a sysadmin submit touches NEITHER (purpose-gating).
    const vUpd0 = (await sql<{ u: string }>(`select updated_at::text u from public.data_recipients where id=${lit(vendorId)};`))[0].u
    const cNd0 = (await sql<{ d: string | null }>(`select next_due_at::text d from public.controls where org_id=${lit(ORG)} and source_playbook_id=${lit(PLAYBOOK)};`))[0]?.d ?? null
    await asAnon(`select public.submit_access_link(${lit(sysTok)}, '[{"q":"x","a":"y"}]'::jsonb);`)
    const vUpd1 = (await sql<{ u: string }>(`select updated_at::text u from public.data_recipients where id=${lit(vendorId)};`))[0].u
    const cNd1 = (await sql<{ d: string | null }>(`select next_due_at::text d from public.controls where org_id=${lit(ORG)} and source_playbook_id=${lit(PLAYBOOK)};`))[0]?.d ?? null
    check('sysadmin submit touched NEITHER data_recipients NOR the control', vUpd1 === vUpd0 && cNd1 === cNd0)

    // ============================= END-TO-END (vendor) =============================
    console.log('\n[4] vendor chase end-to-end')
    taskId = (await asDpo(`insert into public.tasks (org_id, obligation_id, assignee_actor, title, status) values (${lit(ORG)}, ${lit(REG15)}, 'vendor', 'בקשת DPA', 'open') returning id;`) as { id: string }[])[0].id
    const token = (await asDpo(`select public.mint_access_link('vendor_dpa', ${lit(taskId)}, 'דיפו', ${lit(VENDOR_DPA_QSET_ID)}, now()+interval '21 days', ${lit(vendorId)}) as t;`) as { t: string }[])[0].t
    const r = (await asAnon(`select public.resolve_access_link(${lit(token)}) as r;`) as { r: Record<string, unknown> }[])[0].r
    check('resolve returns the vendor set', r.valid === true && r.purpose === 'vendor_dpa' && Array.isArray(r.questions) && (r.questions as unknown[]).length === seedVendorDpaQuestions.length)

    const answers = JSON.stringify([
      { q: 'האם קיים DPA?', a: 'כן', k: 'dpa_has' },
      { q: 'תאריך חתימה', a: '2026-03-01', k: 'dpa_signed_date' },
      { q: 'תאריך פקיעה', a: '', k: 'dpa_expiry_date' },
      { q: 'הערות', a: XSS },
    ])
    const s = (await asAnon(`select public.submit_access_link(${lit(token)}, ${lit(answers)}::jsonb) as s;`) as { s: { ok: boolean } }[])[0].s
    check('submit ok', s.ok === true)

    const dr = (await sql<{ has_dpa: boolean; dpa_signed_date: string; dpa_expiry_date: string; compliance_verified: boolean; status: string }>(
      `select has_dpa, dpa_signed_date, dpa_expiry_date, compliance_verified, status from public.data_recipients where id=${lit(vendorId)};`))[0]
    check('(a) data_recipients.has_dpa = true', dr.has_dpa === true)
    check('(a) dpa_signed_date written (2026-03-01)', dr.dpa_signed_date === '2026-03-01')
    check('(a) dpa_expiry_date defaulted to signed+1yr (2027-03-01)', dr.dpa_expiry_date === '2027-03-01')
    check('(b) compliance_verified UNCHANGED (false - DPO-only)', dr.compliance_verified === false)
    check('(b) status UNCHANGED (active)', dr.status === 'active')

    const ctl = (await sql<{ next_due_at: string; cadence: string; status: string; last_completed_at: string | null }>(
      `select next_due_at, cadence, status, last_completed_at from public.controls where org_id=${lit(ORG)} and source_playbook_id=${lit(PLAYBOOK)};`))[0]
    check('(c) annual control armed: cadence=annual', ctl.cadence === 'annual')
    check('(c) control next_due_at MOVED to the DPA expiry (2027-03-01)', (ctl.next_due_at || '').startsWith('2027-03-01'))
    check('(c) control last_completed_at set by the arming', ctl.last_completed_at != null)

    const ev = (await sql<{ kind: string; answer_ref: string }>(`select kind, answer_ref from public.evidence where obligation_id=${lit(REG15)} and captured_via='access_link' and kind='attestation';`))
    check('(d) evidence(attestation) written', ev.length === 1 && ev[0].kind === 'attestation')
    const tk = (await sql<{ status: string }>(`select status from public.tasks where id=${lit(taskId)};`))[0]
    check('(d) vendor task -> done', tk.status === 'done')
    const obl = (await sql<{ status: string }>(`select status from public.obligations where id=${lit(REG15)};`))[0]
    check('(e) Reg15 obligation_status UNTOUCHED (still checking)', obl.status === 'checking', obl.status)

    // C2 read path + escaping
    const subEv = await sql<EventDbRow>(`select entity_type, event_type, actor, created_at, data from public.events where id=${lit(ev[0].answer_ref)};`)
    const subs = mapSubmissions(subEv)
    const notes = subs[0]?.answers.find((x) => x.a === XSS)
    check('vendor free text stored verbatim (raw)', !!notes && notes.a === XSS)
    const rendered = renderToStaticMarkup(createElement('span', null, XSS))
    check('vendor free text escaped on render (entities, no live tag)', rendered.includes('&lt;script&gt;') && !rendered.includes('<script>'))

    // ============================= ROBUSTNESS =============================
    console.log('\n[5] robustness: malformed date + idempotency')
    task2Id = (await asDpo(`insert into public.tasks (org_id, obligation_id, assignee_actor, title, status) values (${lit(ORG)}, ${lit(REG15)}, 'vendor', 'בקשת DPA 2', 'open') returning id;`) as { id: string }[])[0].id
    const token2 = (await asDpo(`select public.mint_access_link('vendor_dpa', ${lit(task2Id)}, 'דיפו', ${lit(VENDOR_DPA_QSET_ID)}, now()+interval '21 days', ${lit(vendor2Id)}) as t;`) as { t: string }[])[0].t
    const badAnswers = JSON.stringify([{ q: 'DPA?', a: 'כן', k: 'dpa_has' }, { q: 'תאריך', a: 'not-a-date', k: 'dpa_signed_date' }])
    const sb = (await asAnon(`select public.submit_access_link(${lit(token2)}, ${lit(badAnswers)}::jsonb) as s;`) as { s: { ok: boolean } }[])[0].s
    check('submit with malformed date does NOT error (ok)', sb.ok === true)
    const dr2 = (await sql<{ dpa_signed_date: string | null; has_dpa: boolean }>(`select dpa_signed_date, has_dpa from public.data_recipients where id=${lit(vendor2Id)};`))[0]
    check('malformed date stored as NULL (not a bad value)', dr2.dpa_signed_date === null && dr2.has_dpa === true)

    // idempotent resubmit of the FIRST vendor link
    const evB = (await sql<{ n: number }>(`select count(*)::int n from public.evidence where obligation_id=${lit(REG15)} and captured_via='access_link';`))[0].n
    const ndB = (await sql<{ d: string }>(`select next_due_at::text d from public.controls where org_id=${lit(ORG)} and source_playbook_id=${lit(PLAYBOOK)};`))[0].d
    const sr = (await asAnon(`select public.submit_access_link(${lit(token)}, '[{"q":"x","a":"changed","k":"dpa_has"}]'::jsonb) as s;`) as { s: { ok: boolean } }[])[0].s
    const evA = (await sql<{ n: number }>(`select count(*)::int n from public.evidence where obligation_id=${lit(REG15)} and captured_via='access_link';`))[0].n
    const ndA = (await sql<{ d: string }>(`select next_due_at::text d from public.controls where org_id=${lit(ORG)} and source_playbook_id=${lit(PLAYBOOK)};`))[0].d
    console.log(`  (resubmit returned ${JSON.stringify(sr)})`)
    check('idempotent resubmit: no duplicate evidence', evA === evB)
    check('idempotent resubmit: control NOT re-armed (next_due_at unchanged)', ndA === ndB, `before=${ndB} after=${ndA}`)

  } finally {
    console.log('\n[teardown]')
    for (const t of [taskId, task2Id, tmpTaskId]) if (t) await sql(`delete from public.events where entity_id=${lit(t)};`)
    await sql(`delete from public.evidence where obligation_id=${lit(REG15)} and captured_via='access_link';`)
    await sql(`delete from public.access_links where org_id=${lit(ORG)} and obligation_id=${lit(REG15)};`)
    await sql(`delete from public.tasks where org_id=${lit(ORG)} and obligation_id=${lit(REG15)} and assignee_actor in ('vendor','sysadmin') and title in ('בקשת DPA','בקשת DPA 2','tmp','sys');`)
    for (const v of [vendorId, vendor2Id]) if (v) await sql(`delete from public.data_recipients where id=${lit(v)};`)
    if (otherVendorId) await sql(`delete from public.data_recipients where id=${lit(otherVendorId)};`)
    // restore the shared control's next_due_at
    if (hadControl) await sql(`update public.controls set next_due_at=${origNextDue ? lit(origNextDue) : 'NULL'}, last_completed_at=NULL where org_id=${lit(ORG)} and source_playbook_id=${lit(PLAYBOOK)};`)
    const stray = await sql<{ n: number }>(`select count(*)::int n from public.access_links where org_id=${lit(ORG)};`)
    console.log(`  leftover access_links for דיפו: ${stray[0].n}; control next_due restored to ${origNextDue}`)
  }

  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
