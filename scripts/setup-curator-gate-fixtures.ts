/*
 * Task 3 isolation-gate fixtures (idempotent). Proves drill-down reads a client
 * that is NOT the curator's own org, and that other-dpo / unassigned orgs are
 * refused. Creates:
 *   - "בדיקה-שותף": a design-partner client assigned to the +bdika curator's dpo
 *     (dpo_id = 1fd761b7...), NOT the curator's own org. (+ profile for backfill.)
 *   - assigns "קרסטון יועצים" to the OTHER dpo (דנה כהן, 2eaaa677...) so the +bdika
 *     curator must be refused it. "אמיר..." stays unassigned (dpo_id null).
 * Run backfill --apply afterwards to give the partner obligations.
 *
 * Run: set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *      npx tsx scripts/setup-curator-gate-fixtures.ts
 */
export {}
const REF = 'nedkrxjwmyhabrsscyem'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }
const BDIKA_DPO = '1fd761b7-9d32-419c-8e05-1b8204e2d339' // +bdika curator's dpo
const OTHER_DPO = '2eaaa677-4a11-40c5-b7bf-1520091886b1' // דנה כהן (a different dpo)

const v3 = {
  hasDpo: 'not_sure', bizName: 'בדיקה-שותף', storage: ['crm'], industry: 'retail', companyId: '515999002',
  databases: ['customers', 'employees'],
  dbDetails: {
    customers: { size: '1k-10k', access: '3-10', fields: ['טלפון', 'כתובת'], retention: 'sometimes' },
    employees: { size: '100k+', access: '100+', fields: ['ת.ז', 'שכר'], retention: null },
  },
  totalSize: '100k+', hasConsent: 'no_website', processors: ['cloud_hosting'], accessControl: 'partial',
  securityOwner: 'it', rightsWorkflow: 'no', customStorage: [], customDatabases: [], customProcessors: [],
}

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  })
  const j = await r.json()
  if (!Array.isArray(j)) throw new Error(JSON.stringify(j).slice(0, 300))
  return j as T[]
}
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`

async function main() {
  // partner org (create once, keyed by name)
  let [row] = await sql<{ id: string }>(`select id from public.organizations where name='בדיקה-שותף' limit 1;`)
  if (!row) {
    ;[row] = await sql<{ id: string }>(
      `insert into public.organizations (name, business_id, status, tier, feature_flags, dpo_id)
       values ('בדיקה-שותף', '515999002', 'active', 'extended', '{"LEDGER_READ":true}'::jsonb, '${BDIKA_DPO}')
       returning id;`)
    await sql(`insert into public.organization_profiles (org_id, profile_data) values (${lit(row.id)}, ${lit(JSON.stringify({ v3Answers: v3, completedAt: null }))}::jsonb);`)
  } else {
    await sql(`update public.organizations set dpo_id='${BDIKA_DPO}' where id=${lit(row.id)};`)
  }
  console.log('partner org בדיקה-שותף:', row.id, '(dpo_id = +bdika)')

  // other-dpo fixture: Kreston assigned to דנה
  await sql(`update public.organizations set dpo_id='${OTHER_DPO}' where name='קרסטון יועצים';`)
  // unassigned stays null: Amir
  const state = await sql<{ name: string; dpo_id: string | null }>(
    `select name, dpo_id from public.organizations order by name;`)
  console.log('org assignment:', JSON.stringify(state))
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
