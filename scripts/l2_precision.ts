/**
 * L2 precision calculator (Sprint 1, Task 1.8).
 *
 * Reads the reviewed pilot_outputs/review.csv and reports the
 * % of candidates approved AS-IS.
 *
 * Approve column convention (case-insensitive):
 *   y / yes / approved / ✓ / v / 1 / true   → approved as-is
 *   e / edit / edited / m / modified         → edited (NOT approved as-is)
 *   n / no  / rejected / x / 0 / false       → rejected
 *   (blank)                                  → unreviewed; excluded from denominator
 *
 * A non-empty edit_to column also counts the row as "edited" even
 * if the approve cell is blank (covers reviewers who fill the edit
 * column without remembering to mark approve='e').
 *
 * Precision = approved_as_is / (approved_as_is + edited + rejected)
 *
 * Edited rows count against precision: the candidate was wrong as
 * emitted; it needed a human fix. That's what the metric measures —
 * how often the model lands ready-to-use.
 *
 * Usage:
 *   npx tsx scripts/l2_precision.ts                    # default path: pilot_outputs/review.csv
 *   npx tsx scripts/l2_precision.ts path/to/file.csv
 */

import { readFile } from 'node:fs/promises'

const APPROVE_YES  = new Set(['y', 'yes', 'approved', '✓', 'v', '1', 'true'])
const APPROVE_NO   = new Set(['n', 'no', 'rejected', 'x', '0', 'false'])
const APPROVE_EDIT = new Set(['e', 'edit', 'edited', 'm', 'modified'])

// -----------------------------------------------------------------------------
// CSV parsing — handles quoted fields with embedded commas / newlines /
// escaped quotes. Doesn't handle CR/LF inside quoted strings across rows
// (our writer doesn't emit those — statements are single-line trimmed).
// -----------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') {
        out.push(cur)
        cur = ''
      } else cur += ch
    }
  }
  out.push(cur)
  return out
}

function stripBom(s: string): string {
  // UTF-8 BOM
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

interface Bucket {
  approved: number
  edited: number
  rejected: number
  total: number
}

async function main(): Promise<void> {
  const path = process.argv[2] || 'pilot_outputs/review.csv'
  let raw: string
  try {
    raw = stripBom(await readFile(path, 'utf-8'))
  } catch (err) {
    console.error(`failed to read ${path}: ${err instanceof Error ? err.message : err}`)
    process.exit(2)
  }

  const lines = raw.split(/\r?\n/).filter(l => l.length > 0)
  if (lines.length < 2) {
    console.error(`CSV has no data rows (${path})`)
    process.exit(2)
  }
  const header = parseCsvLine(lines[0]).map(s => s.trim())
  const col = (name: string): number => header.indexOf(name)
  const approveIdx = col('approve')
  const nodeTypeIdx = col('node_type')
  const editToIdx = col('edit_to')
  if (approveIdx < 0 || nodeTypeIdx < 0) {
    console.error(
      `CSV missing required columns. Have: [${header.join(', ')}]. Need: approve, node_type`,
    )
    process.exit(2)
  }

  let approved = 0
  let edited = 0
  let rejected = 0
  let blank = 0
  const byType: Record<string, Bucket> = {}

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const av = (cells[approveIdx] || '').trim().toLowerCase()
    const nt = (cells[nodeTypeIdx] || '').trim() || '(unknown)'
    const editVal = editToIdx >= 0 ? (cells[editToIdx] || '').trim() : ''

    let bucket: 'approved' | 'edited' | 'rejected' | 'blank'
    if (APPROVE_YES.has(av)) bucket = 'approved'
    else if (APPROVE_EDIT.has(av) || editVal.length > 0) bucket = 'edited'
    else if (APPROVE_NO.has(av)) bucket = 'rejected'
    else bucket = 'blank'

    if (bucket === 'approved') approved++
    else if (bucket === 'edited') edited++
    else if (bucket === 'rejected') rejected++
    else blank++

    if (bucket !== 'blank') {
      if (!byType[nt]) byType[nt] = { approved: 0, edited: 0, rejected: 0, total: 0 }
      byType[nt][bucket]++
      byType[nt].total++
    }
  }

  const reviewed = approved + edited + rejected
  const precision = reviewed > 0 ? approved / reviewed : 0

  console.log(`\n=== L2 extraction precision ===`)
  console.log(`File:           ${path}`)
  console.log(`Reviewed:       ${reviewed}   (blank/unreviewed: ${blank})`)
  console.log(`  Approved:     ${approved}`)
  console.log(`  Edited:       ${edited}`)
  console.log(`  Rejected:     ${rejected}`)
  console.log(`\nPRECISION (% approved as-is): ${(precision * 100).toFixed(1)}%`)

  console.log(`\n=== by node_type ===`)
  const types = Object.keys(byType).sort()
  if (types.length === 0) {
    console.log(`  (no reviewed rows)`)
  } else {
    const w = Math.max(...types.map(t => t.length), 12)
    for (const t of types) {
      const r = byType[t]
      const p = r.total > 0 ? r.approved / r.total : 0
      console.log(
        `  ${t.padEnd(w)}  approved=${r.approved}  edited=${r.edited}  rejected=${r.rejected}  total=${r.total}  precision=${(p * 100).toFixed(1)}%`,
      )
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
