/*
 * Owner-home test account (idempotent, like setup-curator-pilot.ts). Attaches an
 * admin/owner user to an EXISTING test org with a real ledger, so login routes them
 * to /home and the owner home renders against real obligations/tasks.
 *
 * Org choice: בדיקה-חדש (real 3-obligation ledger). NOTE: all current test orgs are
 * all-'checking' (unassessed) with no owner tasks, so the owner home will show the
 * "still mapping" state (the gaps list + tasks-as-actions need assessed obligations
 * / an owner task to render - exercised in the Task-4 render verify).
 *
 * Run: set -a; source <(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ACCESS_TOKEN)=' .env.local); set +a
 *      npx tsx scripts/setup-owner-pilot.ts
 */
export {}
const REF = 'nedkrxjwmyhabrsscyem'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!, TOKEN = process.env.SUPABASE_ACCESS_TOKEN!
if (!URL || !SERVICE || !TOKEN) { console.error('missing env'); process.exit(1) }
const OWNER_EMAIL = 'adamrozichner+owner@gmail.com'
const OWNER_PW = 'Bdika-Owner-2026!'
const ORG_ID = 'ed0b7711-04bd-4569-af55-c636e35baeb2' // בדיקה-חדש

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  })
  const j = await r.json(); if (!Array.isArray(j)) throw new Error(JSON.stringify(j).slice(0, 300)); return j as T[]
}
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`

async function createAuthUser(email: string, password: string, name: string): Promise<string> {
  const r = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
  })
  const j = await r.json()
  if (j?.id) return j.id
  const look = await (await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json()
  const u = (look.users ?? []).find((x: { email?: string }) => x.email === email)
  if (u?.id) return u.id
  throw new Error(`auth create failed: ${JSON.stringify(j).slice(0, 200)}`)
}

async function main() {
  const authId = await createAuthUser(OWNER_EMAIL, OWNER_PW, 'בעלים (בדיקה)')
  await sql(`insert into public.users (auth_user_id, email, name, role, org_id)
             values (${lit(authId)}, ${lit(OWNER_EMAIL)}, 'בעלים (בדיקה)', 'admin', ${lit(ORG_ID)})
             on conflict (auth_user_id) do update set org_id = excluded.org_id, role = 'admin';`)
  const mix = await sql<{ status: string; n: number }>(`select status, count(*)::int n from public.obligations where org_id=${lit(ORG_ID)} group by status;`)
  console.log(`owner: ${OWNER_EMAIL} / ${OWNER_PW} / role=admin / org=בדיקה-חדש (${ORG_ID})`)
  console.log(`obligation-state mix: ${JSON.stringify(mix)}`)
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
