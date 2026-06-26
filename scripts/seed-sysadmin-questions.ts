/*
 * Seed the PROVISIONAL sysadmin security questionnaire into hub_questions (E2).
 * Operator action (catalog content, not schema - mirrors evaluator-apply.ts).
 * Idempotent: ON CONFLICT (template_id, version) DO UPDATE. Double-runs to prove it.
 *
 * Run:  set -a; source <(grep '^SUPABASE_ACCESS_TOKEN=' .env.local); set +a
 *       npx tsx scripts/seed-sysadmin-questions.ts
 */
import { SYSADMIN_QSET_ID, seedSysadminQuestions } from '../src/lib/ledger/seed-sysadmin-questions'

const REF = 'nedkrxjwmyhabrsscyem'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }

async function sql<T = unknown>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok || (body && (body as { message?: string }).message)) {
    throw new Error(`SQL error: ${(body as { message?: string }).message || res.status}`)
  }
  return body as T[]
}

const litStr = (s: string) => `'${s.replace(/'/g, "''")}'`
const litChoices = (c: string[] | null) => (c === null ? 'NULL' : `'${JSON.stringify(c).replace(/'/g, "''")}'::jsonb`)

function upsertSql(): string {
  const rows = seedSysadminQuestions
    .map((q) =>
      `(${litStr(q.templateId)}, 1, true, ${litStr(SYSADMIN_QSET_ID)}, ${q.orderIndex}, ` +
      `${litStr(q.questionText)}, ${litStr(q.questionType)}, ${litChoices(q.choices)}, ${q.required}, ` +
      `${q.helpText === null ? 'NULL' : litStr(q.helpText)}, 'expert_judgment', 0.5, '{}')`,
    )
    .join(',\n    ')
  return `INSERT INTO public.hub_questions
    (template_id, version, active, asset_template_id, order_index, question_text, question_type, choices, required, help_text, source_tier, confidence, related_sources)
  VALUES
    ${rows}
  ON CONFLICT (template_id, version) DO UPDATE SET
    active = EXCLUDED.active,
    asset_template_id = EXCLUDED.asset_template_id,
    order_index = EXCLUDED.order_index,
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    choices = EXCLUDED.choices,
    required = EXCLUDED.required,
    help_text = EXCLUDED.help_text,
    source_tier = EXCLUDED.source_tier,
    confidence = EXCLUDED.confidence,
    updated_at = now();`
}

async function run() {
  const stmt = upsertSql()
  await sql(stmt)
  const [{ n: n1 }] = await sql<{ n: number }>(
    `select count(*)::int as n from hub_questions where asset_template_id = ${litStr(SYSADMIN_QSET_ID)} and active`,
  )
  console.log(`PASS 1: active sysadmin questions now: ${n1}`)
  await sql(stmt) // idempotency
  const [{ n: n2 }] = await sql<{ n: number }>(
    `select count(*)::int as n from hub_questions where asset_template_id = ${litStr(SYSADMIN_QSET_ID)} and active`,
  )
  console.log(`PASS 2 (idempotent): active sysadmin questions now: ${n2}`)
  if (n1 !== seedSysadminQuestions.length || n2 !== n1) {
    console.error(`FAIL: expected ${seedSysadminQuestions.length} stable across runs, got ${n1}/${n2}`)
    process.exit(1)
  }
  console.log(`OK: ${n2} provisional sysadmin questions seeded (set ${SYSADMIN_QSET_ID}), PROVISIONAL pending Amir/Roy.`)
}

run().catch((e) => { console.error(e); process.exit(1) })
