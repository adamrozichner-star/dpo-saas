/*
 * E4 verification: DSAR pass-through. Proves the PII-routing crux at the DB layer
 * - the dsar submit writes ONLY a PII-free tracking row and touches none of
 * events/evidence/data_subject_requests/messages/audit_logs. Live data via the
 * Management API with role-simulation (anon / DPO). Ephemeral fixtures for דיפו;
 * teardown in finally.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/verify-dsar.ts
 */
export {} // module scope (avoids global-script collisions with other no-import scripts)
const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'       // דיפו
const DPO_SUB = 'ef4f98f3-11fe-43c1-83aa-dc2d6bb73dd5'   // expert_curator in דיפו
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
const counts = () => sql<{ ev: number; evd: number; dsr: number; msg: number; aud: number }>(
  `select
     (select count(*) from public.events where org_id=${lit(ORG)})::int ev,
     (select count(*) from public.evidence where org_id=${lit(ORG)})::int evd,
     (select count(*) from public.data_subject_requests where org_id=${lit(ORG)})::int dsr,
     (select count(*) from public.message_threads where org_id=${lit(ORG)})::int msg,
     (select count(*) from public.audit_logs where org_id=${lit(ORG)})::int aud;`)

async function main() {
  // ---- (a) the tracking table is structurally PII-free ----
  console.log('\n[a] dsar_requests is PII-free')
  const piiCols = await sql<{ c: string }>(`select column_name c from information_schema.columns where table_schema='public' and table_name='dsar_requests' and (column_name ilike '%name%' or column_name ilike '%email%' or column_name ilike '%phone%' or column_name ilike '%requester%' or column_name ilike '%detail%' or column_name ilike '%response%' or column_name ilike '%id_num%' or column_name ilike '%national%' or column_name ilike '%teudat%')`)
  check('no PII-capable column on dsar_requests', piiCols.length === 0, piiCols.map((r) => r.c).join(','))

  // ---- (b) dsar_fn grant-layer firewall ----
  console.log('\n[b] dsar_fn cannot touch events/evidence/obligations (grant-layer)')
  const forbidden = await sql<{ n: number }>(`select count(*)::int n from information_schema.role_table_grants where grantee='dsar_fn' and table_name in ('events','evidence','obligations','data_recipients','controls','contacts','organizations','messages','message_threads','audit_logs','data_subject_requests')`)
  check('dsar_fn has ZERO grant on events/evidence/obligations/etc', forbidden[0].n === 0)
  check('dsar_fn CANNOT SELECT events (role-sim)', await deniedAs('dsar_fn', 'select 1 from public.events limit 1;'))
  check('dsar_fn CANNOT INSERT evidence (role-sim)', await deniedAs('dsar_fn', `insert into public.evidence (org_id,obligation_id,kind,captured_via) values (${lit(ORG)},gen_random_uuid(),'answer','x');`))
  check('dsar_fn CANNOT SELECT obligations (role-sim)', await deniedAs('dsar_fn', 'select 1 from public.obligations limit 1;'))

  // ---- PII-slot proof: the write fn signature carries no PII ----
  console.log('\n[*] dsar_record signature has NO PII slot')
  const sig = await sql<{ a: string }>(`select pg_get_function_arguments(oid) a from pg_proc where proname='dsar_record';`)
  check('dsar_record args are exactly (p_token text, p_request_type text)', sig[0].a === 'p_token text, p_request_type text', sig[0].a)
  const rsig = await sql<{ a: string }>(`select pg_get_function_arguments(oid) a from pg_proc where proname='dsar_resolve';`)
  check('dsar_resolve args are exactly (p_token text)', rsig[0].a === 'p_token text', rsig[0].a)

  let token = ''
  try {
    // ---- mint a dsar link (DPO, RLS) ----
    console.log('\n[e2e] DPO mints, anon resolves + submits')
    token = (await asDpo(`select public.mint_access_link('dsar', null, 'גורם בודק E4', null, now()+interval '30 days', null) as t;`) as { t: string }[])[0].t
    check('dsar mint returns a 64-hex token (no task/obligation needed)', /^[0-9a-f]{64}$/.test(token || ''))
    const linkRow = (await sql<{ obligation_id: string | null; task_id: string | null; q_asset_template_id: string | null; dpo_notify_email: string | null }>(`select obligation_id, task_id, q_asset_template_id, dpo_notify_email from public.access_links where org_id=${lit(ORG)} and purpose='dsar' order by created_at desc limit 1;`))[0]
    check('dsar link has NULL obligation/task/qset (CHECK allows it)', linkRow.obligation_id === null && linkRow.task_id === null && linkRow.q_asset_template_id === null)

    // ---- (f-DB) resolve returns only generic name + dpo email, no org_id/PII ----
    const r = (await asAnon(`select public.dsar_resolve(${lit(token)}) as r;`) as { r: Record<string, unknown> }[])[0].r
    check('dsar_resolve valid', r.valid === true)
    check('dsar_resolve keys are exactly {valid,org_display_name,dpo_notify_email}', Object.keys(r).sort().join(',') === 'dpo_notify_email,org_display_name,valid', Object.keys(r).join(','))
    check('dsar_resolve does NOT leak org_id', !JSON.stringify(r).includes(ORG))

    // ---- (a) submit writes NOTHING to events/evidence/dsr/messages/audit ----
    const before = (await counts())[0]
    const rec = (await asAnon(`select public.dsar_record(${lit(token)}, 'access') as s;`) as { s: { ok: boolean; correlation_ref: string } }[])[0].s
    check('dsar_record ok', rec.ok === true)
    check('correlation_ref looks like DSR-xxxx', /^DSR-[0-9A-F]+$/.test(rec.correlation_ref || ''), rec.correlation_ref)
    const after = (await counts())[0]
    check('events UNCHANGED by dsar submit', after.ev === before.ev, `${before.ev}->${after.ev}`)
    check('evidence UNCHANGED by dsar submit', after.evd === before.evd, `${before.evd}->${after.evd}`)
    check('data_subject_requests UNCHANGED by dsar submit', after.dsr === before.dsr, `${before.dsr}->${after.dsr}`)
    check('message_threads UNCHANGED by dsar submit', after.msg === before.msg, `${before.msg}->${after.msg}`)
    check('audit_logs UNCHANGED by dsar submit', after.aud === before.aud, `${before.aud}->${after.aud}`)

    // the PII-free tracking row exists with the right shape
    const tr = (await sql<{ request_type: string; status: string; deadline_ok: boolean; org_id: string }>(`select request_type, status, (deadline = created_at + interval '30 days') deadline_ok, org_id from public.dsar_requests where correlation_ref=${lit(rec.correlation_ref)};`))[0]
    check('tracking row: request_type=access, status=received, org-scoped', tr && tr.request_type === 'access' && tr.status === 'received' && tr.org_id === ORG)
    check('tracking row: deadline = created_at + 30 days', tr && tr.deadline_ok === true)
    const lk = (await sql<{ status: string }>(`select status from public.access_links where token_hash = encode(extensions.digest(${lit(token)},'sha256'),'hex');`))[0]
    check('dsar link burned (status=used)', lk.status === 'used')

    // ---- idempotent resubmit ----
    console.log('\n[idempotent] resubmit a used dsar token')
    const dsrBefore = (await sql<{ n: number }>(`select count(*)::int n from public.dsar_requests where org_id=${lit(ORG)};`))[0].n
    const rec2 = (await asAnon(`select public.dsar_record(${lit(token)}, 'erasure') as s;`) as { s: { ok: boolean; correlation_ref: string } }[])[0].s
    const dsrAfter = (await sql<{ n: number }>(`select count(*)::int n from public.dsar_requests where org_id=${lit(ORG)};`))[0].n
    check('resubmit returns same correlation_ref', rec2.ok === true && rec2.correlation_ref === rec.correlation_ref)
    check('resubmit creates NO new tracking row', dsrAfter === dsrBefore)

    // ---- (d) submit_access_link dsar-reject guard ----
    console.log('\n[d] submit_access_link rejects a dsar token, writes nothing')
    // mint a fresh active dsar link for this test
    const token2 = (await asDpo(`select public.mint_access_link('dsar', null, 'גורם בודק 2', null, now()+interval '30 days', null) as t;`) as { t: string }[])[0].t
    const gBefore = (await counts())[0]
    const guard = (await asAnon(`select public.submit_access_link(${lit(token2)}, '[{"q":"x","a":"y"}]'::jsonb) as s;`) as { s: { ok: boolean } }[])[0].s
    const gAfter = (await counts())[0]
    check('submit_access_link returns {ok:false} for a dsar token', guard.ok === false)
    check('guard wrote NOTHING to events/evidence', gAfter.ev === gBefore.ev && gAfter.evd === gBefore.evd)
    const lk2 = (await sql<{ status: string }>(`select status from public.access_links where token_hash = encode(extensions.digest(${lit(token2)},'sha256'),'hex');`))[0]
    check('dsar link NOT burned by the rejected submit (still active)', lk2.status === 'active')

  } finally {
    console.log('\n[teardown]')
    await sql(`delete from public.dsar_requests where org_id=${lit(ORG)} and org_id=${lit(ORG)};`)
    await sql(`delete from public.access_links where org_id=${lit(ORG)} and purpose='dsar';`)
    const stray = await sql<{ n: number }>(`select count(*)::int n from public.access_links where org_id=${lit(ORG)};`)
    const strayDsr = await sql<{ n: number }>(`select count(*)::int n from public.dsar_requests where org_id=${lit(ORG)};`)
    console.log(`  leftover dsar access_links: ${stray[0].n}; leftover dsar_requests: ${strayDsr[0].n}`)
  }

  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
