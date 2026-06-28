/*
 * F2d data migration: copy existing descriptive data from the legacy
 * organization_profiles into the v3 org_descriptors (so renders read the ledger).
 * ADDITIVE / strangler: legacy organization_profiles is read-only here and stays
 * byte-identical. Idempotent: ON CONFLICT (org_id) DO UPDATE. Safe to re-run.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/migrate-org-descriptors.ts
 */
export {} // module scope (avoids global-script collisions with other no-import scripts)
const REF = 'nedkrxjwmyhabrsscyem'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }
async function sql<T = unknown>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok || (body && (body as { message?: string }).message)) throw new Error(`SQL: ${(body as { message?: string }).message || res.status}`)
  return body as T[]
}

const COPY = `INSERT INTO public.org_descriptors (org_id, data_categories, processing_purposes, security_measures)
SELECT org_id, coalesce(data_types, '[]'::jsonb), coalesce(processing_purposes, '[]'::jsonb), coalesce(security_measures, '[]'::jsonb)
FROM public.organization_profiles WHERE org_id IS NOT NULL
ON CONFLICT (org_id) DO UPDATE SET
  data_categories = EXCLUDED.data_categories,
  processing_purposes = EXCLUDED.processing_purposes,
  security_measures = EXCLUDED.security_measures,
  updated_at = now();`

async function run() {
  await sql(COPY)
  const [{ n: n1 }] = await sql<{ n: number }>(`select count(*)::int n from public.org_descriptors;`)
  console.log(`PASS 1: org_descriptors rows: ${n1}`)
  await sql(COPY) // idempotency
  const [{ n: n2 }] = await sql<{ n: number }>(`select count(*)::int n from public.org_descriptors;`)
  console.log(`PASS 2 (idempotent): org_descriptors rows: ${n2}`)
  if (n2 !== n1) { console.error(`FAIL: not idempotent (${n1} -> ${n2})`); process.exit(1) }
  console.log(`OK: descriptive data migrated into org_descriptors (legacy organization_profiles untouched).`)
}
run().catch((e) => { console.error(e); process.exit(1) })
