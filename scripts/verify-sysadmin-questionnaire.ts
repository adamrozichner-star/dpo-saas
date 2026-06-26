/*
 * E2 verification: the sysadmin questionnaire flow end-to-end + the links UI
 * data path + the untrusted-answer escaping proof. Live data via the Management
 * API SQL endpoint, with role-simulation (SET LOCAL role + jwt claims) to run the
 * anon (public) and authenticated (DPO / other-org) paths exactly as production.
 * Ephemeral fixtures for org "דיפו", torn down in a finally block.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/verify-sysadmin-questionnaire.ts
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createHash } from 'node:crypto'
import { SYSADMIN_QSET_ID, seedSysadminQuestions } from '../src/lib/ledger/seed-sysadmin-questions'
import { mapSubmissions, type EventDbRow } from '../src/lib/console-data'

const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'           // דיפו
const DPO_SUB = 'ef4f98f3-11fe-43c1-83aa-dc2d6bb73dd5'       // expert_curator in דיפו
const OTHER_SUB = '3f29fa73-5578-4697-a705-872ed1515f90'     // a user in a DIFFERENT org (אמיר פסטרנק)
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

let pass = 0, fail = 0
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  ::  ' + detail : ''}`) }
}

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok || (body && (body as { message?: string }).message)) {
    throw new Error(`SQL: ${(body as { message?: string }).message || res.status}\n${query.slice(0, 160)}`)
  }
  return body as T[]
}
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const asAnon = (stmt: string) => sql(`set local role anon; ${stmt}`)
const asDpo = (stmt: string) => sql(`set local role authenticated; set local request.jwt.claims = '{"sub":"${DPO_SUB}","role":"authenticated"}'; ${stmt}`)
const asOther = (stmt: string) => sql(`set local role authenticated; set local request.jwt.claims = '{"sub":"${OTHER_SUB}","role":"authenticated"}'; ${stmt}`)

const XSS = '<script>alert(1)</script><img src=x onerror=alert(2)>'

async function main() {
  // ----------------------------------------------- 0. SEED (PROVISIONAL)
  console.log('\n[0] provisional sysadmin question-set seeded')
  const qs = await sql<{ n: number }>(`select count(*)::int n from public.hub_questions where asset_template_id=${lit(SYSADMIN_QSET_ID)} and active`)
  check(`${seedSysadminQuestions.length} active questions under the set`, qs[0].n === seedSysadminQuestions.length, `live=${qs[0].n}`)
  const prov = await sql<{ n: number }>(`select count(*)::int n from public.hub_questions where asset_template_id=${lit(SYSADMIN_QSET_ID)} and (source_tier <> 'expert_judgment' or confidence <> 0.5)`)
  check('all rows marked PROVISIONAL (expert_judgment / 0.5)', prov[0].n === 0)

  // pick a REAL דיפו obligation
  const obRow = await sql<{ id: string; title: string }>(`select id, title from public.obligations where org_id=${lit(ORG)} order by severity limit 1`)
  const ob = obRow[0].id
  console.log(`  target obligation: ${obRow[0].title} (${ob})`)
  let taskId = ''

  try {
    // ----------------------------- 1. DPO flow: create task + mint (RLS)
    console.log('\n[1] DPO mint flow (authenticated, RLS-scoped)')
    const t = await asDpo(`insert into public.tasks (org_id, obligation_id, assignee_actor, title, status) values (${lit(ORG)}, ${lit(ob)}, 'sysadmin', 'שאלון אבטחה לסיסטם', 'open') returning id;`) as { id: string }[]
    taskId = t[0].id
    check('DPO created an obligation-linked sysadmin task under RLS', !!taskId)
    const minted = await asDpo(`select public.mint_access_link('sysadmin_questionnaire', ${lit(taskId)}, 'דיפו', ${lit(SYSADMIN_QSET_ID)}, now() + interval '14 days') as token;`) as { token: string }[]
    const token = minted[0].token
    check('mint returned a 64-hex token', /^[0-9a-f]{64}$/.test(token || ''))

    // ----------------------------------- 2. RESOLVE (anon) the set
    console.log('\n[2] sysadmin opens the link (anon resolve)')
    const r = (await asAnon(`select public.resolve_access_link(${lit(token)}) as r;`) as { r: Record<string, unknown> }[])[0].r
    check('resolve valid', r.valid === true)
    check('purpose = sysadmin_questionnaire', r.purpose === 'sysadmin_questionnaire')
    check('org_display_name shown', r.org_display_name === 'דיפו')
    check(`returns the ${seedSysadminQuestions.length}-question set`, Array.isArray(r.questions) && (r.questions as unknown[]).length === seedSysadminQuestions.length)
    check('CC-2: response keys are exactly {org_display_name,purpose,questions,valid}',
      Object.keys(r).sort().join(',') === 'org_display_name,purpose,questions,valid')

    // ------------------------ 3. SUBMIT (anon) self-describing + XSS
    console.log('\n[3] sysadmin submits (self-describing answers incl. untrusted free text)')
    const answers = JSON.stringify([
      { q: 'האם מתבצעים גיבויים שוטפים?', a: 'כן' },
      { q: 'הערות מערכות מורשת', a: XSS },
    ])
    const s = (await asAnon(`select public.submit_access_link(${lit(token)}, ${lit(answers)}::jsonb) as s;`) as { s: { ok: boolean } }[])[0].s
    check('submit ok', s.ok === true)

    const ev = await sql<{ kind: string; captured_via: string; answer_ref: string; obligation_id: string }>(`select kind, captured_via, answer_ref, obligation_id from public.evidence where obligation_id=${lit(ob)};`)
    check('evidence written, obligation-scoped (kind=answer, via=access_link)', ev.length === 1 && ev[0].kind === 'answer' && ev[0].captured_via === 'access_link' && ev[0].obligation_id === ob)
    const evt = await sql<{ id: string; entity_type: string; event_type: string }>(`select id, entity_type, event_type from public.events where entity_id=${lit(taskId)} and event_type='access_link_submitted';`)
    check('submission event written on the task', evt.length === 1 && evt[0].entity_type === 'task')
    check('evidence.answer_ref == submission event id', ev[0].answer_ref === evt[0].id)
    const taskAfter = await sql<{ status: string }>(`select status from public.tasks where id=${lit(taskId)};`)
    check('task -> done', taskAfter[0].status === 'done')
    const obAfter = await sql<{ status: string }>(`select status from public.obligations where id=${lit(ob)};`)
    check('TRUST BOUNDARY: obligation_status UNCHANGED (DPO judges)', obAfter[0].status === 'checking', obAfter[0].status)

    // -------- 4. C2 read path: events-by-answer_ref -> mapSubmissions
    console.log('\n[4] C2 read path: events-by-answer_ref -> rendered Q->A')
    const subEventRows = await sql<EventDbRow & { id: string }>(`select entity_type, event_type, actor, created_at, data from public.events where id=${lit(ev[0].answer_ref)};`)
    const submissions = mapSubmissions(subEventRows as EventDbRow[])
    check('mapSubmissions extracts one submission', submissions.length === 1)
    check('answers carry frozen question text + values', submissions[0].answers.length === 2 && submissions[0].answers[0].q === 'האם מתבצעים גיבויים שוטפים?' && submissions[0].answers[0].a === 'כן')
    const xssAnswer = submissions[0].answers[1].a
    check('untrusted free-text answer stored verbatim (raw, not pre-mangled)', xssAnswer === XSS)

    // ESCAPING PROOF (auth-free): the C2 page renders answers as React text
    // children (<span>{qa.a}</span>) - this is exactly that path. React escapes
    // text children, so the markup must contain ENTITIES, never a live tag.
    const rendered = renderToStaticMarkup(createElement('span', null, xssAnswer))
    check('XSS payload escaped on render (entities present)', rendered.includes('&lt;script&gt;') && rendered.includes('&lt;img'))
    check('XSS payload NOT rendered as live HTML (no executable tag)', !rendered.includes('<script>') && !rendered.includes('<img'))

    // ------------------------------------- 5. IDEMPOTENT RESUBMIT
    console.log('\n[5] idempotent resubmit (used token)')
    const evB = (await sql<{ n: number }>(`select count(*)::int n from public.evidence where obligation_id=${lit(ob)};`))[0].n
    const s2 = (await asAnon(`select public.submit_access_link(${lit(token)}, '[]'::jsonb) as s;`) as { s: { ok: boolean } }[])[0].s
    const evA = (await sql<{ n: number }>(`select count(*)::int n from public.evidence where obligation_id=${lit(ob)};`))[0].n
    console.log(`  (resubmit returned ${JSON.stringify(s2)})`)
    check('resubmit clean + NO duplicate evidence', evA === evB && evA === 1, `before=${evB} after=${evA}`)

    // ----------------------- 6. LINKS MANAGEMENT UI: RLS-scoped
    console.log('\n[6] links management UI (RLS-scoped list + revoke)')
    const linkRow = await sql<{ id: string }>(`select id from public.access_links where task_id=${lit(taskId)};`)
    const linkId = linkRow[0].id
    const dpoSees = await asDpo(`select count(*)::int n from public.access_links where id=${lit(linkId)};`) as { n: number }[]
    check('DPO (own org) sees the link', dpoSees[0].n === 1)
    const otherSees = await asOther(`select count(*)::int n from public.access_links where id=${lit(linkId)};`) as { n: number }[]
    check('CROSS-ORG: a different org sees NOTHING (RLS isolates)', otherSees[0].n === 0)

    // cross-org revoke must affect 0 rows; mint a fresh active link for the DPO revoke
    const otherRevoke = await asOther(`with upd as (update public.access_links set status='revoked' where id=${lit(linkId)} returning id) select count(*)::int n from upd;`) as { n: number }[]
    check('CROSS-ORG revoke affects 0 rows (denied)', otherRevoke[0].n === 0)

    const t2 = await asDpo(`insert into public.tasks (org_id, obligation_id, assignee_actor, title, status) values (${lit(ORG)}, ${lit(ob)}, 'sysadmin', 'שאלון נוסף', 'open') returning id;`) as { id: string }[]
    await asDpo(`select public.mint_access_link('sysadmin_questionnaire', ${lit(t2[0].id)}, 'דיפו', ${lit(SYSADMIN_QSET_ID)}, now() + interval '14 days') as token;`)
    const dpoRevoke = await asDpo(`with upd as (update public.access_links set status='revoked' where task_id=${lit(t2[0].id)} and status='active' returning id) select count(*)::int n from upd;`) as { n: number }[]
    check('DPO revokes own active link (1 row)', dpoRevoke[0].n === 1)
    const revStatus = await sql<{ status: string }>(`select status from public.access_links where task_id=${lit(t2[0].id)};`)
    check('revoked link is now status=revoked', revStatus[0].status === 'revoked')

  } finally {
    console.log('\n[teardown] removing ephemeral fixtures (questions stay - they are the catalog)')
    await sql(`delete from public.access_links where org_id=${lit(ORG)} and obligation_id=${lit(ob)};`)
    await sql(`delete from public.evidence where obligation_id=${lit(ob)};`)
    if (taskId) await sql(`delete from public.events where entity_id=${lit(taskId)};`)
    await sql(`delete from public.tasks where org_id=${lit(ORG)} and obligation_id=${lit(ob)} and title in ('שאלון אבטחה לסיסטם','שאלון נוסף');`)
    const stray = await sql<{ n: number }>(`select count(*)::int n from public.access_links where org_id=${lit(ORG)};`)
    console.log(`  leftover access_links for דיפו: ${stray[0].n}`)
  }

  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
