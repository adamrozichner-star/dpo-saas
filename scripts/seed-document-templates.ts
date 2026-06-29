/*
 * Seed the 4 PROVISIONAL F1 document templates into hub_document_templates.
 * Operator action (catalog content, not schema - mirrors seed-sysadmin-questions).
 * Idempotent: ON CONFLICT (template_id, version) DO UPDATE. Double-runs to prove it.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/seed-document-templates.ts
 */
import { seedDocumentTemplates, DOC_ORG_LEVEL_ASSET_ID } from '../src/lib/ledger/seed-document-templates'

const REF = 'nedkrxjwmyhabrsscyem'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

async function sql<T = unknown>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok || (body && (body as { message?: string }).message)) {
    throw new Error(`SQL error: ${(body as { message?: string }).message || res.status}`)
  }
  return body as T[]
}
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`

function upsertSql(): string {
  const rows = seedDocumentTemplates
    .map((t) =>
      `(${lit(t.templateId)}, 1, true, ${lit(DOC_ORG_LEVEL_ASSET_ID)}, ${lit(t.name)}, ` +
      `${lit(t.docType + ' (PROVISIONAL - not for customer use until Amir/Roy review)')}, ${lit(t.body)}, ` +
      `${lit(JSON.stringify({ doc_type: t.docType }))}::jsonb, 'markdown', 'expert_judgment', 0.5, '{}', NULL)`)
    .join(',\n    ')
  return `INSERT INTO public.hub_document_templates
    (template_id, version, active, asset_template_id, name, description, body, variables, output_format, source_tier, confidence, related_sources, reviewed_by)
  VALUES
    ${rows}
  ON CONFLICT (template_id, version) DO UPDATE SET
    active = EXCLUDED.active,
    asset_template_id = EXCLUDED.asset_template_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    output_format = EXCLUDED.output_format,
    source_tier = EXCLUDED.source_tier,
    confidence = EXCLUDED.confidence,
    reviewed_by = EXCLUDED.reviewed_by,
    updated_at = now();`
}

async function run() {
  const stmt = upsertSql()
  await sql(stmt)
  const [{ n: n1 }] = await sql<{ n: number }>(`select count(*)::int as n from hub_document_templates where asset_template_id = ${lit(DOC_ORG_LEVEL_ASSET_ID)} and active`)
  console.log(`PASS 1: active F1 doc templates now: ${n1}`)
  await sql(stmt)
  const [{ n: n2 }] = await sql<{ n: number }>(`select count(*)::int as n from hub_document_templates where asset_template_id = ${lit(DOC_ORG_LEVEL_ASSET_ID)} and active`)
  console.log(`PASS 2 (idempotent): active F1 doc templates now: ${n2}`)
  if (n1 !== seedDocumentTemplates.length || n2 !== n1) {
    console.error(`FAIL: expected ${seedDocumentTemplates.length} stable across runs, got ${n1}/${n2}`)
    process.exit(1)
  }
  console.log(`OK: ${n2} PROVISIONAL F1 doc templates seeded (expert_judgment/0.5, reviewed_by=null), pending Amir/Roy.`)
}

run().catch((e) => { console.error(e); process.exit(1) })
