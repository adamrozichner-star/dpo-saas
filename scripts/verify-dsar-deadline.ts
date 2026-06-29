/*
 * E4 follow-up verification: the DSAR deemed-refusal alert (dsar-deadline.ts).
 * Proves at the DB layer what the Inngest check relies on:
 *   - the FK dsar_requests.access_link_id -> access_links that powers the
 *     PostgREST embed access_links(dpo_notify_email);
 *   - the DPO notify email is recoverable per request via that join;
 *   - the deemed_refusal = created_at + 21d threshold math, and the open-only filter.
 * Ephemeral fixtures for דיפו, backdated to hit each stage; teardown in finally.
 * No Resend, no notifications-table writes - logic is asserted in SQL.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/verify-dsar-deadline.ts
 */
export {}
const REF = 'nedkrxjwmyhabrsscyem'
const ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'       // דיפו
const DPO_SUB = 'ef4f98f3-11fe-43c1-83aa-dc2d6bb73dd5'   // expert_curator in דיפו
const DEEMED_DAYS = 21
const WARN_LEAD_DAYS = 5
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

// Mirrors the function's stage logic so we assert the same thresholds.
function stageFor(daysToDeemed: number): 'warning' | 'overdue' | null {
  if (daysToDeemed <= 0) return 'overdue'
  if (daysToDeemed <= WARN_LEAD_DAYS) return 'warning'
  return null
}

async function main() {
  // ---- (a) schema the embed depends on ----
  console.log('\n[a] FK + column that power the embed')
  const fk = await sql<{ n: number }>(`select count(*)::int n from pg_constraint where conrelid='public.dsar_requests'::regclass and contype='f' and confrelid='public.access_links'::regclass`)
  check('FK dsar_requests.access_link_id -> access_links exists', fk[0].n === 1)
  const col = await sql<{ n: number }>(`select count(*)::int n from information_schema.columns where table_name='access_links' and column_name='dpo_notify_email'`)
  check('access_links.dpo_notify_email exists', col[0].n === 1)

  let cref = ''
  try {
    // ---- (b) seed an open request via the real intake path; recover DPO email via the join ----
    console.log('\n[b] open request + dpo_notify_email recoverable via join')
    const token = (await asDpo(`select public.mint_access_link('dsar', null, 'גורם בודק deadline', null, now()+interval '30 days', null) as t;`) as { t: string }[])[0].t
    const rec = (await asAnon(`select public.dsar_record(${lit(token)}, 'access') as s;`) as { s: { ok: boolean; correlation_ref: string } }[])[0].s
    cref = rec.correlation_ref
    check('intake created a tracking row', rec.ok === true && /^DSR-/.test(cref))
    const joined = (await sql<{ email: string | null; status: string }>(`select a.dpo_notify_email email, d.status from public.dsar_requests d left join public.access_links a on a.id=d.access_link_id where d.correlation_ref=${lit(cref)};`))[0]
    check('join resolves the request row (powers the embed)', joined !== undefined)
    check('fresh request status is open (received)', joined.status === 'received')
    // Informational: a null here is an ORG-CONFIG gap (no contacts.role=dpo / no
    // organizations.contact_email / no users.role=admin), which also blocks the
    // existing intake handoff. The function degrades to a notification row only.
    console.log(`  NOTE  dpo_notify_email = ${joined.email ?? 'NULL (org-config gap; email alert would be skipped)'}`)

    // helper: backdate created_at and read back the function's daysToDeemed
    const daysToDeemedAfterBackdate = async (ageDays: number): Promise<number> => {
      await sql(`update public.dsar_requests set created_at = now() - interval '${ageDays} days' where correlation_ref=${lit(cref)};`)
      const r = (await sql<{ d: number }>(`select extract(epoch from (created_at + interval '${DEEMED_DAYS} days' - now()))/86400 d from public.dsar_requests where correlation_ref=${lit(cref)};`))[0]
      return Number(r.d)
    }

    // ---- (c) fresh request (age 0): no alert ----
    console.log('\n[c] stage thresholds')
    const dFresh = await daysToDeemedAfterBackdate(0)
    check('age 0d -> no stage (outside lead window)', stageFor(dFresh) === null, `daysToDeemed=${dFresh.toFixed(1)}`)

    // ---- (d) inside the lead window (age 17d -> 4 days to mark): warning ----
    const dWarn = await daysToDeemedAfterBackdate(DEEMED_DAYS - 4)
    check('age 17d -> warning (<=5d before mark, >0)', stageFor(dWarn) === 'warning', `daysToDeemed=${dWarn.toFixed(1)}`)

    // ---- (e) past the mark (age 25d): overdue ----
    const dOver = await daysToDeemedAfterBackdate(DEEMED_DAYS + 4)
    check('age 25d -> overdue (past mark)', stageFor(dOver) === 'overdue', `daysToDeemed=${dOver.toFixed(1)}`)

    // ---- (f) open-only filter: completed/rejected are excluded ----
    console.log('\n[f] open-only filter')
    await sql(`update public.dsar_requests set status='completed' where correlation_ref=${lit(cref)};`)
    const openRows = (await sql<{ n: number }>(`select count(*)::int n from public.dsar_requests where org_id=${lit(ORG)} and correlation_ref=${lit(cref)} and status not in ('completed','rejected');`))[0]
    check('completed request excluded by the open-only filter', openRows.n === 0)
  } finally {
    console.log('\n[teardown]')
    await sql(`delete from public.dsar_requests where org_id=${lit(ORG)};`)
    await sql(`delete from public.access_links where org_id=${lit(ORG)} and purpose='dsar';`)
    const strayDsr = (await sql<{ n: number }>(`select count(*)::int n from public.dsar_requests where org_id=${lit(ORG)};`))[0].n
    const strayLk = (await sql<{ n: number }>(`select count(*)::int n from public.access_links where org_id=${lit(ORG)} and purpose='dsar';`))[0].n
    console.log(`  leftover dsar_requests: ${strayDsr}; leftover dsar access_links: ${strayLk}`)
  }

  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('\nFATAL', e); process.exit(2) })
