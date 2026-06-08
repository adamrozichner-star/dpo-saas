/**
 * L2 extraction harness (Sprint 1, Tasks 1.5–1.7).
 *
 * Pipeline: pilot_inputs/{*.pdf,*.txt,*.md}
 *           → pdf-parse / fs.readFile (text)
 *           → claude-haiku-4-5-20251001 (one shot, retries=1)
 *           → JSON array of typed candidate assertions
 *           → pilot_outputs/<basename>.json (per input)
 *           → pilot_outputs/review.csv  (one row per candidate, blank approve col)
 *
 * Run:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/l2_extract.ts
 *
 * Required env:
 *   ANTHROPIC_API_KEY
 *
 * -----------------------------------------------------------------------------
 * WHY DIRECT SDK AND NOT src/lib/anthropic.ts createMessage()
 * -----------------------------------------------------------------------------
 * The central wrapper imports @sentry/nextjs and runs an in-process
 * semaphore + 3-retry policy — built for Next.js serverless route
 * use, not for an offline CLI. Loading it here would pull the Sentry
 * + Next runtime context into a plain Node script.
 *
 * For a pilot batch (handful of PDFs, manual review):
 *   - retries=1 is the contract anyway (matches src/lib/regulatory/
 *     pdf-extractor.ts and the extraction-config convention)
 *   - no concurrency demand (one file at a time is fine)
 *   - no Sentry telemetry needed for an offline review run
 * Direct SDK call keeps the script standalone. If the harness ever
 * gets promoted to a runtime path (worker, route), route it through
 * createMessage() at that point.
 *
 * -----------------------------------------------------------------------------
 * OUTPUT CONTRACT
 * -----------------------------------------------------------------------------
 * Per-file JSON: { source_file, candidates: Candidate[], raw_response, ts }
 * review.csv: source_file,candidate_idx,node_type,statement,confidence,
 *             page_or_span,extracted_at,approve,reject_reason,edit_to
 *
 * CSV is written with a UTF-8 BOM so Excel opens Hebrew correctly. Reviewer
 * fills the `approve` column (y / n / e) and optionally reject_reason /
 * edit_to. scripts/l2_precision.ts reads the result.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse'

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 8192
const INPUT_DIR = 'pilot_inputs'
const OUTPUT_DIR = 'pilot_outputs'
const REVIEW_CSV = 'review.csv'

// The 8 node types, locked. Any string outside this set is dropped at
// post-validation with a warning. Matches the L2 graph design.
const VALID_NODE_TYPES = new Set<string>([
  'obligation',
  'condition',
  'exception',
  'asset_type',
  'document_template',
  'control',
  'gap_rule',
  'authority_position',
])

// -----------------------------------------------------------------------------
// System prompt — locked in this file for Sprint 1.5 so prompt iteration
// is part of code review. Move to a config / DB row only when the prompt
// stabilizes.
// -----------------------------------------------------------------------------

const SYSTEM_PROMPT = `אתה מערכת לחילוץ מובנה של טענות מטקסט רגולטורי בעברית.

המשימה: לקרוא את הקלט ולפלוט מערך JSON של "טענות מועמדות" (candidate
assertions). כל אובייקט במערך חייב להתאים בדיוק לאחד משמונת סוגי הצמתים
הבאים:

1. obligation         — חובה: פעולה שעל הגורם המוסדר מוטלת חובה לבצעה
                        (לדוגמה: "חייב למנות ממונה הגנת פרטיות").
2. condition          — תנאי: טריגר או קריטריון שמפעיל חובה
                        (לדוגמה: "כאשר המאגר מכיל מעל 10,000 רשומות").
3. exception          — חריג: גריעה / פטור שמסיר חובה במקרים מסוימים
                        (לדוגמה: "למעט מאגרים של גוף ציבורי מסוים").
4. asset_type         — סוג נכס: סוג מאגר / מערכת / נכס שהרגולציה נוגעת אליו
                        (לדוגמה: "מאגר רפואי", "מערכת CCTV").
5. document_template  — תבנית מסמך: מסמך / הודעה / הסכם שהרגולציה דורשת
                        (לדוגמה: "הודעה לנושא מידע", "הסכם עיבוד מידע (DPA)").
6. control            — בקרה: אמצעי טכני או ארגוני נדרש
                        (לדוגמה: "אימות דו-שלבי לגישה למידע רגיש").
7. gap_rule           — כלל פערים: כלל להערכת ציות מול פער
                        (לדוגמה: "אם אין ממונה ויש מעל X רשומות → פער חמור").
8. authority_position — עמדת רשות: עמדה / פרשנות מפורשת של הרשות להגנת הפרטיות
                        (לדוגמה: "הרשות סבורה שמצלמות בכניסה מהוות ניטור שיטתי").

חוקים מחייבים:
- כל אובייקט = טענה אטומית אחת. אל תאחד שתי טענות לאובייקט אחד; פצל.
- אם הטקסט המקור בעברית — שדה statement חייב להיות בעברית.
- שדה statement: ניסוח עצמאי וברור של הטענה, לא ציטוט פסקה.
- שדה confidence: מספר בטווח [0.0, 1.0] המבטא את הבטחון בנכונות הטענה
  ובהתאמתה לסוג הצומת שבחרת.
- שדה provenance.page_or_span: עוגן קצר במקור — מספר עמוד / סעיף /
  ביטוי ייחודי שמופיע בטקסט המקור. אם לא ניתן לזהות עוגן — "unknown".
- אל תמציא טענות שלא נובעות במישרין מהטקסט המקור.
- פלוט אך ורק מערך JSON. ללא טקסט מקדים, ללא markdown fences, ללא
  הסברים. אם אין שום טענה ראויה — פלוט מערך ריק: [].

מבנה כל אובייקט:
{
  "node_type": "<אחד מהשמונה לעיל>",
  "statement": "<טענה אטומית בעברית>",
  "confidence": 0.85,
  "provenance": {
    "source_file":   "",
    "page_or_span":  "<עוגן קצר במקור>",
    "extracted_at":  ""
  }
}

השדות "source_file" ו-"extracted_at" יוזרקו על-ידי ההרנס — השאר אותם
ריקים. אל תנסה לנחש את שם הקובץ.
`

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Candidate {
  node_type: string
  statement: string
  confidence: number
  provenance: {
    source_file: string
    page_or_span: string
    extracted_at: string
  }
}

interface FileOutput {
  source_file: string
  extracted_at: string
  model: string
  text_length: number
  candidates: Candidate[]
  raw_response: string
}

// -----------------------------------------------------------------------------
// I/O helpers
// -----------------------------------------------------------------------------

async function readInputText(path: string): Promise<string> {
  const ext = extname(path).toLowerCase()
  if (ext === '.pdf') {
    const buf = await readFile(path)
    const { text } = await pdfParse(buf)
    return text
  }
  if (ext === '.txt' || ext === '.md') {
    return readFile(path, 'utf-8')
  }
  throw new Error(`unsupported file extension: ${ext} (${path})`)
}

function stripJsonFences(s: string): string {
  let cleaned = s.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  return cleaned
}

function csvEscape(v: string | number): string {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// -----------------------------------------------------------------------------
// Extraction
// -----------------------------------------------------------------------------

async function extractFromText(
  client: Anthropic,
  text: string,
): Promise<{ candidates: Candidate[]; raw: string }> {
  const userContent = `קלט לחילוץ:

\`\`\`
${text}
\`\`\``

  // retries=1 — pilot config. One shot; if it fails the operator re-runs.
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const block = resp.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') {
    throw new Error('no text content in response')
  }
  const raw = block.text
  const cleaned = stripJsonFences(raw)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    throw new Error(
      `JSON parse failed: ${err instanceof Error ? err.message : String(err)}. ` +
      `First 500 chars: ${cleaned.slice(0, 500)}`,
    )
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      `response is not a JSON array. typeof=${typeof parsed}, first 500 chars: ${cleaned.slice(0, 500)}`,
    )
  }

  // Validate each candidate; drop + warn on shape violations rather
  // than aborting the whole file. The pilot wants whatever's salvageable.
  const candidates: Candidate[] = []
  for (let i = 0; i < parsed.length; i++) {
    const c = parsed[i] as Record<string, unknown> | null
    if (!c || typeof c !== 'object') {
      console.warn(`    skip candidate ${i}: not an object`)
      continue
    }
    const nt = c.node_type
    if (typeof nt !== 'string' || !VALID_NODE_TYPES.has(nt)) {
      console.warn(`    skip candidate ${i}: invalid node_type "${String(nt)}"`)
      continue
    }
    const st = c.statement
    if (typeof st !== 'string' || st.trim().length === 0) {
      console.warn(`    skip candidate ${i}: empty/non-string statement`)
      continue
    }
    const cf = c.confidence
    if (typeof cf !== 'number' || cf < 0 || cf > 1 || Number.isNaN(cf)) {
      console.warn(`    skip candidate ${i}: invalid confidence ${String(cf)}`)
      continue
    }
    const pv = c.provenance as Record<string, unknown> | undefined
    const page =
      pv && typeof pv.page_or_span === 'string' && pv.page_or_span.trim().length > 0
        ? pv.page_or_span.trim()
        : 'unknown'

    candidates.push({
      node_type: nt,
      statement: st.trim(),
      confidence: cf,
      provenance: {
        source_file: '',   // injected by caller
        page_or_span: page,
        extracted_at: '',  // injected by caller
      },
    })
  }

  return { candidates, raw }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set')
    process.exit(1)
  }
  const client = new Anthropic({ apiKey })

  await mkdir(OUTPUT_DIR, { recursive: true })

  let entries: string[]
  try {
    entries = await readdir(INPUT_DIR)
  } catch (err) {
    console.error(`failed to read ${INPUT_DIR}/: ${err instanceof Error ? err.message : err}`)
    console.error(`create the directory and drop .pdf/.txt/.md files into it`)
    process.exit(2)
  }
  const files = entries.filter(f => /\.(pdf|txt|md)$/i.test(f)).sort()
  if (files.length === 0) {
    console.error(`no .pdf/.txt/.md files in ${INPUT_DIR}/`)
    process.exit(2)
  }

  // CSV with UTF-8 BOM so Excel opens Hebrew correctly.
  const csvRows: string[] = []
  csvRows.push(
    [
      'source_file',
      'candidate_idx',
      'node_type',
      'statement',
      'confidence',
      'page_or_span',
      'extracted_at',
      'approve',
      'reject_reason',
      'edit_to',
    ]
      .map(csvEscape)
      .join(','),
  )

  const summary: Array<{ file: string; count: number; status: 'ok' | 'failed' }> = []

  for (const f of files) {
    const path = join(INPUT_DIR, f)
    console.log(`\n>> ${f}`)

    let text: string
    try {
      text = await readInputText(path)
    } catch (err) {
      console.error(`  read failed: ${err instanceof Error ? err.message : err}`)
      summary.push({ file: f, count: 0, status: 'failed' })
      continue
    }
    if (!text || text.trim().length === 0) {
      console.warn('  empty text after parse — skip')
      summary.push({ file: f, count: 0, status: 'failed' })
      continue
    }
    console.log(`  ${text.length} chars`)

    const extractedAt = new Date().toISOString()
    let candidates: Candidate[] = []
    let raw = ''
    try {
      const r = await extractFromText(client, text)
      candidates = r.candidates
      raw = r.raw
    } catch (err) {
      console.error(`  extract failed: ${err instanceof Error ? err.message : err}`)
      summary.push({ file: f, count: 0, status: 'failed' })
      continue
    }

    candidates.forEach(c => {
      c.provenance.source_file = f
      c.provenance.extracted_at = extractedAt
    })

    const out: FileOutput = {
      source_file: f,
      extracted_at: extractedAt,
      model: MODEL,
      text_length: text.length,
      candidates,
      raw_response: raw,
    }
    const outPath = join(OUTPUT_DIR, `${basename(f, extname(f))}.json`)
    await writeFile(outPath, JSON.stringify(out, null, 2), 'utf-8')
    console.log(`  ${candidates.length} candidates → ${outPath}`)

    candidates.forEach((c, i) => {
      csvRows.push(
        [
          f,
          i,
          c.node_type,
          c.statement,
          c.confidence,
          c.provenance.page_or_span,
          c.provenance.extracted_at,
          '', // approve
          '', // reject_reason
          '', // edit_to
        ]
          .map(csvEscape)
          .join(','),
      )
    })

    summary.push({ file: f, count: candidates.length, status: 'ok' })
  }

  const csvPath = join(OUTPUT_DIR, REVIEW_CSV)
  // ﻿ = UTF-8 BOM. Makes Excel + Numbers open Hebrew correctly.
  await writeFile(csvPath, '﻿' + csvRows.join('\n') + '\n', 'utf-8')

  console.log(`\n=== summary ===`)
  summary.forEach(s => {
    const tag = s.status === 'ok' ? `${s.count} candidates` : 'FAILED'
    console.log(`  ${s.file}: ${tag}`)
  })
  console.log(`\nReview CSV: ${csvPath}`)
  console.log(
    `Reviewer: fill the "approve" column with y / n / e (yes / no / edit) ` +
    `then run: npx tsx scripts/l2_precision.ts`,
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
