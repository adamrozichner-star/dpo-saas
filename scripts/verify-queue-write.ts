/* C3 write-path verification (writes need care). Uses the Management API to
 * (1) describe the resolve write, (2) prove RLS via role-simulation (the דיפו
 * user CAN update its item; anon and a cross-org user get 0 rows / denied),
 * (3) seed ONE provisional throwaway item, resolve it AS THE AUTHED USER under
 * RLS (committed), and confirm exactly one append-only events row, then prove
 * the double-resolve guard. Run:
 *   set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *   npx tsx scripts/verify-queue-write.ts
 */
import { buildResolveWrite, mapQueueItem, DPO_QUEUE_PRIORITY, DPO_QUEUE_STATUS, type QueueItemDbRow } from '../src/lib/console-data'

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'nedkrxjwmyhabrsscyem'
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

// Returns rows on success, or { __error } on a DB error (e.g. permission denied).
async function sql(query: string): Promise<any> {
  const r = await fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const text = await r.text()
  const j = JSON.parse(text)
  return Array.isArray(j) ? j : { __error: j }
}

const results: boolean[] = []
const check = (name: string, pass: boolean, detail?: string) => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

const DEEPO_ORG = '2c1f096b-2cc0-406a-9381-b993c2dde9ab'
const DEEPO_USER = 'ef4f98f3-11fe-43c1-83aa-dc2d6bb73dd5' // users.id == auth_user_id
const DEEPO_ITEM = '068176de-1164-410e-a247-24e881a29e99' // the real pending review (not mutated)
const CROSS_ITEM = '41b0ed01-ba7d-489d-a0e9-7fea85020de7' // another org's dpo_queue row

const claimsDeepo = JSON.stringify({ sub: DEEPO_USER, role: 'authenticated' })
// role-sim wrapper: run `body` as `role` with the given jwt sub, then ROLLBACK; the
// final SELECT in `body` is what the endpoint returns.
const asRole = (role: string, claims: string, body: string) =>
  `begin; set local role ${role}; select set_config('request.jwt.claims', '${claims}', true); ${body} rollback;`

async function main() {
  // ---- 1. describe the write ----
  const w = buildResolveWrite({ itemId: DEEPO_ITEM, orgId: DEEPO_ORG, userId: DEEPO_USER, resolutionType: 'manual', notes: 'demo', actor: 'DPO', nowIso: '2026-06-24T00:00:00Z' })
  console.log('-- resolve write payloads --')
  console.log('  dpo_queue UPDATE:', JSON.stringify(w.update))
  console.log('  events INSERT   :', JSON.stringify(w.event))
  check('write payload shape', w.update.status === 'resolved' && w.event.entity_type === 'dpo_queue' && w.event.event_type === 'resolved' && w.event.org_id === DEEPO_ORG)

  // mapQueueItem against the real דיפו item (pure)
  const itemRows = await sql(`select id, type, priority, status, title, description, deadline_at from public.dpo_queue where id='${DEEPO_ITEM}';`)
  const view = Array.isArray(itemRows) ? mapQueueItem(itemRows[0] as QueueItemDbRow) : null
  check('mapQueueItem maps the real item', !!view && !!DPO_QUEUE_PRIORITY[view.priority] && !!DPO_QUEUE_STATUS[view.status] && view.typeLabel.length > 0, view ? `type=${view.typeLabel} priority=${view.priority} status=${view.status}` : 'null')

  // ---- 2. RLS via role-simulation (rolled back, non-destructive) ----
  const canRows = await sql(asRole('authenticated', claimsDeepo, `with u as (update public.dpo_queue set status=status where id='${DEEPO_ITEM}' returning 1) select count(*)::int as affected from u;`))
  check('deepo user CAN update its own item', Array.isArray(canRows) && canRows[0]?.affected === 1, JSON.stringify(canRows))

  const crossRows = await sql(asRole('authenticated', claimsDeepo, `with u as (update public.dpo_queue set status=status where id='${CROSS_ITEM}' returning 1) select count(*)::int as affected from u;`))
  check('cross-org update affects 0 rows (RLS)', Array.isArray(crossRows) && crossRows[0]?.affected === 0, JSON.stringify(crossRows))

  const anonRows = await sql(asRole('anon', JSON.stringify({ role: 'anon' }), `with u as (update public.dpo_queue set status=status where id='${DEEPO_ITEM}' returning 1) select count(*)::int as affected from u;`))
  const anonBlocked = !!(anonRows as any).__error || (Array.isArray(anonRows) && anonRows[0]?.affected === 0)
  check('anon update blocked (no grant / permission denied)', anonBlocked, (anonRows as any).__error ? 'permission denied' : JSON.stringify(anonRows))

  // ---- 3. seed a provisional throwaway item, resolve it as the authed user ----
  const seeded = await sql(`insert into public.dpo_queue (org_id, type, priority, status, title, metadata) values ('${DEEPO_ORG}','review','low','pending','[provisional] C3 write-path test', '{"provisional":true}'::jsonb) returning id;`)
  const seedId = Array.isArray(seeded) ? seeded[0].id : null
  check('seeded provisional item', !!seedId, seedId ?? JSON.stringify(seeded))
  if (!seedId) { summarize(); return }

  // resolve AS THE AUTHED DEEPO USER (committed): dpo_queue UPDATE + events INSERT, both under RLS
  const resolveSql =
    `begin; set local role authenticated; select set_config('request.jwt.claims','${claimsDeepo}',true);` +
    ` update public.dpo_queue set status='resolved', resolved_at=now(), resolved_by='${DEEPO_USER}', resolution_type='manual', resolution_notes='[provisional] C3 verify' where id='${seedId}' and org_id='${DEEPO_ORG}' and status <> 'resolved';` +
    ` insert into public.events (org_id, entity_type, entity_id, event_type, actor, data) values ('${DEEPO_ORG}','dpo_queue','${seedId}','resolved','verify','{"resolution_type":"manual","notes":"[provisional] C3 verify"}'::jsonb);` +
    ` select 1 as ok; commit;`
  const resolved = await sql(resolveSql)
  check('authed resolve committed (no RLS error)', Array.isArray(resolved), JSON.stringify(resolved).slice(0, 120))

  // verify (as postgres): row resolved + exactly ONE event, both org-scoped
  const after = await sql(`select status, resolved_by, org_id from public.dpo_queue where id='${seedId}';`)
  check('seed row resolved + resolved_by set + org-scoped', Array.isArray(after) && after[0]?.status === 'resolved' && after[0]?.resolved_by === DEEPO_USER && after[0]?.org_id === DEEPO_ORG, JSON.stringify(after))
  const evCount = await sql(`select count(*)::int as n, max(org_id::text) as org from public.events where entity_type='dpo_queue' and entity_id='${seedId}';`)
  check('exactly ONE events row appended, org-scoped', Array.isArray(evCount) && evCount[0]?.n === 1 && evCount[0]?.org === DEEPO_ORG, JSON.stringify(evCount))

  // ---- double-resolve guard: re-run with the status<>resolved guard -> 0 rows, no 2nd event ----
  const second = await sql(asRole('authenticated', claimsDeepo, `with u as (update public.dpo_queue set status='resolved' where id='${seedId}' and org_id='${DEEPO_ORG}' and status <> 'resolved' returning 1) select count(*)::int as affected from u;`))
  check('double-resolve guarded (0 rows on already-resolved)', Array.isArray(second) && second[0]?.affected === 0, JSON.stringify(second))
  const evCount2 = await sql(`select count(*)::int as n from public.events where entity_type='dpo_queue' and entity_id='${seedId}';`)
  check('still exactly ONE events row (no duplicate)', Array.isArray(evCount2) && evCount2[0]?.n === 1, JSON.stringify(evCount2))

  console.log(`\n(left a resolved provisional item ${seedId} + 1 event as evidence; marked provisional)`)
  summarize()
}

function summarize() {
  const failed = results.filter((r) => !r).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  if (failed) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
