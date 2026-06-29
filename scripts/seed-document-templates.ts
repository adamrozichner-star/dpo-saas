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

const ver = (t: { version?: number }) => t.version ?? 1

function upsertSql(): string {
  const rows = seedDocumentTemplates
    .map((t) =>
      `(${lit(t.templateId)}, ${ver(t)}, true, ${lit(DOC_ORG_LEVEL_ASSET_ID)}, ${lit(t.name)}, ` +
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

// Exactly one ACTIVE row per template_id: deactivate any prior version of a seeded
// template (e.g. privacy_policy v1 after the v2 bump). Scoped to the org-level doc
// catalog so unrelated templates are never touched. Renderer + freshness both fetch
// active=true keyed by template_id, so a stale active row would be ambiguous.
function deactivateOldVersionsSql(): string {
  const pairs = seedDocumentTemplates.map((t) => `(${lit(t.templateId)}, ${ver(t)})`).join(', ')
  return `UPDATE public.hub_document_templates
  SET active = false, updated_at = now()
  WHERE asset_template_id = ${lit(DOC_ORG_LEVEL_ASSET_ID)}
    AND active = true
    AND (template_id, version) NOT IN (${pairs});`
}

async function run() {
  const stmt = upsertSql()
  const deact = deactivateOldVersionsSql()
  await sql(stmt); await sql(deact)
  const [{ n: n1 }] = await sql<{ n: number }>(`select count(*)::int as n from hub_document_templates where asset_template_id = ${lit(DOC_ORG_LEVEL_ASSET_ID)} and active`)
  console.log(`PASS 1: active F1 doc templates now: ${n1}`)
  await sql(stmt); await sql(deact)
  const [{ n: n2 }] = await sql<{ n: number }>(`select count(*)::int as n from hub_document_templates where asset_template_id = ${lit(DOC_ORG_LEVEL_ASSET_ID)} and active`)
  console.log(`PASS 2 (idempotent): active F1 doc templates now: ${n2}`)
  // Exactly one active row per template_id (no ambiguity for the renderer).
  const dupes = await sql<{ template_id: string; n: number }>(`select template_id, count(*)::int n from hub_document_templates where asset_template_id = ${lit(DOC_ORG_LEVEL_ASSET_ID)} and active group by template_id having count(*) > 1`)
  if (dupes.length) {
    console.error(`FAIL: multiple active versions for ${dupes.map((d) => d.template_id).join(', ')}`)
    process.exit(1)
  }
  if (n1 !== seedDocumentTemplates.length || n2 !== n1) {
    console.error(`FAIL: expected ${seedDocumentTemplates.length} stable across runs, got ${n1}/${n2}`)
    process.exit(1)
  }
  const [{ v: ppv }] = await sql<{ v: number }>(`select version v from hub_document_templates where template_id = 'd0c00005-0000-4000-8000-000000000005' and active`)
  console.log(`OK: ${n2} PROVISIONAL F1 doc templates seeded; privacy_policy active version = ${ppv}. Pending Amir/Roy.`)
}

run().catch((e) => { console.error(e); process.exit(1) })
