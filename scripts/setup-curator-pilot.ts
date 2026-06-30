/*
 * Pilot task 2 data setup (reproducible, idempotent). NO DDL - dpos.auth_user_id
 * and organizations.dpo_id already exist; this only wires the pilot DPO to their
 * assigned org:
 *   - a dpos row linked to the +bdika curator's auth_user_id
 *   - organizations.dpo_id of בדיקה-חדש set to that dpo
 * Leaves all other orgs (דיפו / Kreston / Amir) unassigned. Verified by
 * scripts/verify-curator-scoping.ts.
 *
 * Run: set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *      npx tsx scripts/setup-curator-pilot.ts
 */
export {}
const REF = 'nedkrxjwmyhabrsscyem'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

const CURATOR_AUTH_ID = 'f6affd7c-8590-4fb3-98b2-85ecc2e8c164' // adamrozichner+bdika
const ASSIGNED_ORG_ID = 'ed0b7711-04bd-4569-af55-c636e35baeb2' // בדיקה-חדש

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  })
  const j = await r.json()
  if (!Array.isArray(j)) throw new Error(JSON.stringify(j).slice(0, 300))
  return j as T[]
}

async function main() {
  const rows = await sql<{ name: string; dpo_id: string }>(
    `with d as (
       insert into public.dpos (name, email, license_number, auth_user_id)
       values ('אדם רוזיכנר', 'adamrozichner+bdika@gmail.com', 'PILOT-DPO-001', '${CURATOR_AUTH_ID}')
       on conflict (email) do update set auth_user_id = excluded.auth_user_id, license_number = excluded.license_number
       returning id
     )
     update public.organizations set dpo_id = (select id from d) where id = '${ASSIGNED_ORG_ID}'
     returning name, dpo_id;`,
  )
  console.log('assigned:', JSON.stringify(rows))
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
