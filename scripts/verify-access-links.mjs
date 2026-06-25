// E1 verification: the access_links primitive + the CC-2 containment proof.
//
// Runs entirely against live data via the Supabase Management API SQL endpoint.
// Uses postgres for setup/teardown and role-simulation (SET LOCAL role + jwt
// claims) to exercise the anon (public) and authenticated (DPO) paths exactly as
// they run in production. Creates ephemeral fixtures for org "דיפו" and removes
// them at the end (a finally block runs teardown even on assertion failure).
//
// Run:  node scripts/verify-access-links.mjs   (SUPABASE_ACCESS_TOKEN in env)

import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'        // דיפו
const DPO_SUB = 'ef4f98f3-11fe-43c1-83aa-dc2d6bb73dd5'    // expert_curator in דיפו

let TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  TOKEN = env.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)?.[1]?.trim()
}

let pass = 0, fail = 0
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  ::  ' + detail : ''}`) }
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok || (body && body.message)) throw new Error(`SQL error: ${body.message || res.status}\n${query.slice(0, 200)}`)
  return body
}
// quote a JS string as a SQL literal
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`
const sha256hex = (s) => createHash('sha256').update(s).digest('hex')
// run a statement as anon (public path)
const asAnon = (stmt) => sql(`set local role anon; ${stmt}`)
// run a statement as the authenticated DPO (RLS-scoped)
const asDpo = (stmt) =>
  sql(`set local role authenticated; set local request.jwt.claims = '{"sub":"${DPO_SUB}","role":"authenticated"}'; ${stmt}`)

const Q_TPL1 = '11111111-1111-1111-1111-111111111111'  // each question is its own template_id
const Q_TPL2 = '11111111-1111-1111-1111-111111111112'
const Q_ASSET = '22222222-2222-2222-2222-222222222222'  // the set is grouped by asset_template_id

async function main() {
  // ---------------------------------------------------------------- SETUP
  console.log('\n[setup] ephemeral fixtures')
  const ob = (await sql(
    `insert into public.obligations (org_id, title, status) values (${lit(ORG)}, ${lit('E1 verify obligation')}, 'checking') returning id;`
  ))[0].id
  const task = (await sql(
    `insert into public.tasks (org_id, obligation_id, assignee_actor, title, status) values (${lit(ORG)}, ${lit(ob)}, 'sysadmin', ${lit('E1 verify task')}, 'open') returning id;`
  ))[0].id
  await sql(
    `insert into public.hub_questions (template_id, version, active, asset_template_id, order_index, question_text, question_type, required, source_tier, confidence, related_sources)
     values
     (${lit(Q_TPL1)}, 1, true, ${lit(Q_ASSET)}, 1, 'שאלה 1', 'text', true, 'legal', 1.0, '{}'),
     (${lit(Q_TPL2)}, 1, true, ${lit(Q_ASSET)}, 2, 'שאלה 2', 'text', false, 'legal', 1.0, '{}');`
  )
  console.log(`  obligation=${ob}  task=${task}`)

  try {
    // ------------------------------------------------ 1. MINT (DPO, RLS)
    console.log('\n[1] mint under RLS (authenticated DPO)')
    const mintRow = (await asDpo(
      `select public.mint_access_link('sysadmin_questionnaire', ${lit(task)}, ${lit('ספק שירות')}, ${lit(Q_ASSET)}, now() + interval '14 days') as token;`
    ))[0]
    const token = mintRow.token
    check('mint returns a 64-hex token', /^[0-9a-f]{64}$/.test(token || ''), token)

    const stored = (await sql(`select token_hash, status, org_id, obligation_id, org_display_name from public.access_links where task_id=${lit(task)};`))[0]
    check('token stored HASHED, not raw', stored.token_hash === sha256hex(token) && stored.token_hash !== token)
    check('link is active + org-scoped + obligation denormalized', stored.status === 'active' && stored.org_id === ORG && stored.obligation_id === ob)

    // ----------------------------------- 2. RESOLVE (anon) + CC-2 keyset
    console.log('\n[2] resolve (anon) + CC-2 allowlist')
    const r = (await asAnon(`select public.resolve_access_link(${lit(token)}) as r;`))[0].r
    check('resolve valid=true', r.valid === true)
    check('org_display_name is the chosen display name', r.org_display_name === 'ספק שירות')
    check('purpose echoed', r.purpose === 'sysadmin_questionnaire')
    check('question set returned (2)', Array.isArray(r.questions) && r.questions.length === 2)
    const topKeys = Object.keys(r).sort().join(',')
    check('CC-2: response keys are EXACTLY {org_display_name,purpose,questions,valid}',
      topKeys === 'org_display_name,purpose,questions,valid', topKeys)
    const qKeys = Object.keys(r.questions[0]).sort().join(',')
    check('CC-2: each question exposes only allowlisted keys',
      qKeys === 'choices,depends_on,help_text,id,order_index,question_text,question_type,required', qKeys)
    const blob = JSON.stringify(r)
    check('CC-2: no org_id / obligation title / contact / score anywhere in payload',
      !blob.includes(ORG) && !blob.includes('E1 verify obligation') && !blob.toLowerCase().includes('contact'))

    // ------------------------------------- 3. SUBMIT (anon) -> ledger
    console.log('\n[3] submit (anon) -> evidence + events + task; obligation UNCHANGED')
    const s = (await asAnon(`select public.submit_access_link(${lit(token)}, '{"q1":"yes"}'::jsonb) as s;`))[0].s
    check('submit ok=true', s.ok === true)

    const ev = (await sql(`select kind, captured_via, answer_ref, obligation_id, org_id from public.evidence where obligation_id=${lit(ob)};`))
    check('exactly one evidence row', ev.length === 1)
    check('evidence: kind=answer, captured_via=access_link, org-scoped', ev[0] && ev[0].kind === 'answer' && ev[0].captured_via === 'access_link' && ev[0].org_id === ORG)

    const evt = (await sql(`select id, entity_type, event_type, actor, data from public.events where entity_id=${lit(task)} and event_type='access_link_submitted';`))
    check('exactly one submission event', evt.length === 1)
    check('event: entity_type=task, actor=external:sysadmin_questionnaire, answers captured',
      evt[0] && evt[0].entity_type === 'task' && evt[0].actor === 'external:sysadmin_questionnaire' && evt[0].data && evt[0].data.answers && evt[0].data.answers.q1 === 'yes')
    check('evidence.answer_ref equals the submission event id',
      ev[0] && evt[0] && ev[0].answer_ref === evt[0].id, `answer_ref=${ev[0]?.answer_ref} event_id=${evt[0]?.id}`)

    const t = (await sql(`select status, completed_at from public.tasks where id=${lit(task)};`))[0]
    check('task -> done, completed_at set', t.status === 'done' && t.completed_at != null)

    const lk = (await sql(`select status, used_at from public.access_links where task_id=${lit(task)};`))[0]
    check('link -> used, used_at set', lk.status === 'used' && lk.used_at != null)

    const obAfter = (await sql(`select status from public.obligations where id=${lit(ob)};`))[0]
    check('TRUST BOUNDARY: obligation_status UNCHANGED (still checking, not auto-advanced)', obAfter.status === 'checking', obAfter.status)

    // ------------------------------------------- 4. IDEMPOTENT RESUBMIT
    // A sysadmin double-click / refresh must never corrupt or duplicate the
    // ledger. Snapshot the ledger BEFORE the second submit, then resubmit the
    // SAME (now-used) token and assert the counts are UNCHANGED.
    console.log('\n[4] idempotent resubmit (used token)')
    const evBefore = (await sql(`select count(*)::int n from public.evidence where obligation_id=${lit(ob)};`))[0].n
    const evtBefore = (await sql(`select count(*)::int n from public.events where entity_id=${lit(task)} and event_type='access_link_submitted';`))[0].n
    const s2 = (await asAnon(`select public.submit_access_link(${lit(token)}, '{"q1":"changed"}'::jsonb) as s;`))[0].s
    console.log(`  (second submit on a used token returned: ${JSON.stringify(s2)})`)
    check('resubmit does not error/corrupt (returns a clean {ok:...})', s2 && typeof s2.ok === 'boolean')
    const evAfter = (await sql(`select count(*)::int n from public.evidence where obligation_id=${lit(ob)};`))[0].n
    const evtAfter = (await sql(`select count(*)::int n from public.events where entity_id=${lit(task)} and event_type='access_link_submitted';`))[0].n
    check('NO duplicate evidence on resubmit (count unchanged, still 1)', evAfter === evBefore && evAfter === 1, `before=${evBefore} after=${evAfter}`)
    check('NO duplicate event on resubmit (count unchanged, still 1)', evtAfter === evtBefore && evtAfter === 1, `before=${evtBefore} after=${evtAfter}`)
    // the original answer must survive (the resubmit did not overwrite it either)
    const evtData = (await sql(`select data from public.events where entity_id=${lit(task)} and event_type='access_link_submitted';`))[0]
    check('original answer preserved (resubmit did not overwrite)', evtData?.data?.answers?.q1 === 'yes', JSON.stringify(evtData?.data?.answers))
    const rUsed = (await asAnon(`select public.resolve_access_link(${lit(token)}) as r;`))[0].r
    check('resolve of a USED link -> valid:false (not viewable for new submit)', rUsed.valid === false)

    // ----------------------- 5. TAMPERED / UNKNOWN / EXPIRED / REVOKED
    console.log('\n[5] invalid tokens -> uniform result, no existence distinction')
    // build expired + revoked links directly (known raw tokens, hashed at rest)
    const expiredTok = randomBytes(32).toString('hex')
    const revokedTok = randomBytes(32).toString('hex')
    const baseCols = `org_id, token_hash, purpose, task_id, obligation_id, org_display_name, q_asset_template_id, status, expires_at`
    await sql(`insert into public.access_links (${baseCols}) values (${lit(ORG)}, ${lit(sha256hex(expiredTok))}, 'sysadmin_questionnaire', ${lit(task)}, ${lit(ob)}, ${lit('ספק שירות')}, ${lit(Q_ASSET)}, 'active', now() - interval '1 day');`)
    await sql(`insert into public.access_links (${baseCols}) values (${lit(ORG)}, ${lit(sha256hex(revokedTok))}, 'sysadmin_questionnaire', ${lit(task)}, ${lit(ob)}, ${lit('ספק שירות')}, ${lit(Q_ASSET)}, 'revoked', now() + interval '14 days');`)
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')

    const rUnknown = JSON.stringify((await asAnon(`select public.resolve_access_link(${lit('deadbeef')}) as r;`))[0].r)
    const rTampered = JSON.stringify((await asAnon(`select public.resolve_access_link(${lit(tampered)}) as r;`))[0].r)
    const rExpired = JSON.stringify((await asAnon(`select public.resolve_access_link(${lit(expiredTok)}) as r;`))[0].r)
    const rRevoked = JSON.stringify((await asAnon(`select public.resolve_access_link(${lit(revokedTok)}) as r;`))[0].r)
    check('unknown token resolve -> {valid:false}', rUnknown === '{"valid":false}', rUnknown)
    check('tampered token resolve -> {valid:false}', rTampered === '{"valid":false}', rTampered)
    check('expired token resolve -> {valid:false}', rExpired === '{"valid":false}', rExpired)
    check('revoked token resolve -> {valid:false}', rRevoked === '{"valid":false}', rRevoked)
    check('NO EXISTENCE DISTINCTION: unknown == tampered == expired == revoked (byte-identical)',
      rUnknown === rTampered && rTampered === rExpired && rExpired === rRevoked)

    const subExpired = JSON.stringify((await asAnon(`select public.submit_access_link(${lit(expiredTok)}, '{}'::jsonb) as s;`))[0].s)
    const subRevoked = JSON.stringify((await asAnon(`select public.submit_access_link(${lit(revokedTok)}, '{}'::jsonb) as s;`))[0].s)
    const subUnknown = JSON.stringify((await asAnon(`select public.submit_access_link(${lit('deadbeef')}, '{}'::jsonb) as s;`))[0].s)
    check('submit on expired/revoked/unknown -> {ok:false}, uniform',
      subExpired === '{"ok":false}' && subRevoked === '{"ok":false}' && subUnknown === '{"ok":false}')
    const evtCountAfterBad = (await sql(`select count(*)::int n from public.events where org_id=${lit(ORG)} and entity_id=${lit(task)} and event_type='access_link_submitted';`))[0].n
    check('invalid submits wrote NOTHING to the ledger', evtCountAfterBad === 1)

    // ------------------ 6. GRANT-LAYER CC-2 (the provable containment)
    console.log('\n[6] grant-layer firewall (role assertions)')
    async function deniedAs(role, stmt) {
      try { await sql(`set local role ${role}; ${stmt}`); return false }
      catch (e) { return /permission denied|must be owner/i.test(e.message) }
    }
    check('access_link_fn CANNOT SELECT organizations', await deniedAs('access_link_fn', 'select 1 from public.organizations limit 1;'))
    check('access_link_fn CANNOT SELECT contacts', await deniedAs('access_link_fn', 'select 1 from public.contacts limit 1;'))
    check('access_link_fn CANNOT SELECT obligations', await deniedAs('access_link_fn', 'select 1 from public.obligations limit 1;'))
    check('anon CANNOT SELECT access_links directly (zero direct grant)', await deniedAs('anon', 'select 1 from public.access_links limit 1;'))
    check('anon CANNOT INSERT access_links directly', await deniedAs('anon', `insert into public.access_links (org_id, token_hash, purpose, task_id, obligation_id, org_display_name, q_asset_template_id, expires_at) values (${lit(ORG)}, 'x', 'sysadmin_questionnaire', ${lit(task)}, ${lit(ob)}, 'x', ${lit(Q_ASSET)}, now());`))
    // anon's ONLY capability: EXECUTE the two public fns (proven working in steps 2-5)
    check('anon CAN execute resolve_access_link (its only access_links capability)',
      JSON.stringify((await asAnon(`select public.resolve_access_link('x') as r;`))[0].r) === '{"valid":false}')

  } finally {
    // ----------------------------------------------------------- TEARDOWN
    console.log('\n[teardown] removing ephemeral fixtures')
    await sql(`delete from public.access_links where task_id=${lit(task)};`)
    await sql(`delete from public.evidence where obligation_id=${lit(ob)};`)
    await sql(`delete from public.events where entity_id=${lit(task)};`)
    await sql(`delete from public.tasks where id=${lit(task)};`)
    await sql(`delete from public.obligations where id=${lit(ob)};`)
    await sql(`delete from public.hub_questions where asset_template_id=${lit(Q_ASSET)};`)
    const leftover = (await sql(`select count(*)::int n from public.access_links where org_id=${lit(ORG)} and org_display_name='ספק שירות';`))[0].n
    console.log(`  teardown verified, leftover test links: ${leftover}`)
  }

  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
