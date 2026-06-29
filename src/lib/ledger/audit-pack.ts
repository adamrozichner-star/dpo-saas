// =============================================================================
// F2a: Certify. buildAuditPack is a PURE assembler (console-data pattern, no IO /
// no clock for the fingerprint) over what the ledger already holds: every
// obligation + state + provenance, its evidence chain (E1-E4 collected proof,
// each tracing to its source event), its control schedule, and the F1 approved
// docs. Produces { content (markdown snapshot), fingerprint, summary }.
//
// The fingerprint is a reproducible hash of the canonical assembled INPUTS minus
// the volatile generated-at, so the same ledger state always yields the same
// pack fingerprint (drift detection). The hash matches doc-render's approach
// (cyrb53 + stable-key JSON); kept local here to avoid touching the merged F1
// module.
// =============================================================================

import { OBLIGATION_STATUS, SEVERITY, type ObligationStatus, type Severity } from '@/components/ledger/status'

export interface AuditEvidence {
  kind: string
  capturedAt: string | null
  capturedVia: string | null
  ref: string | null // answer_ref -> the source event id (the proof trace)
}
export interface AuditControl {
  name: string
  cadence: string
  nextDueAt: string | null
  lastCompletedAt: string | null
}
export interface AuditProvenance {
  name: string
  sourceTierLabel: string | null
  confidence: number | null
}
export interface AuditObligation {
  id: string
  title: string
  status: ObligationStatus
  severity: Severity | null
  sourceRuleId: string | null
  sourceVersion: number | null
  statusChangedAt: string | null
  provenance: AuditProvenance | null
  evidence: AuditEvidence[]
  control: AuditControl | null
}
export interface AuditDoc {
  type: string
  title: string
  version: number | null
  approvedAt: string | null
  fingerprint: string | null
}
export interface AuditPackInput {
  // ② Controller identity: the audit pack is the report-to-the-Authority context,
  // so it MUST carry the controller's details (Roy, 2026-06-29). name is always
  // present; businessId (organizations.business_id) + address (org_descriptors)
  // render when set, else a clear missing-marker. Kept OUT of public/marketing copy.
  org: { name: string; businessId?: string | null; address?: string | null }
  score: number | null
  dpoName: string | null
  generatedAtIso: string // shown in the header; NOT in the fingerprint (volatile)
  obligations: AuditObligation[]
  documents: AuditDoc[]
}
export interface AuditPackSummary {
  obligations: number
  evidence: number
  controls: number
  documents: number
}
export interface AuditPack {
  content: string
  fingerprint: string
  summary: AuditPackSummary
}

// ---- deterministic hash (cyrb53) + stable-key JSON (mirrors doc-render) -------
function hashStr(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}
function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null)
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']'
  const keys = Object.keys(v as Record<string, unknown>).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical((v as Record<string, unknown>)[k])).join(',') + '}'
}

const d = (s: string | null | undefined) => (s && String(s).trim() ? String(s) : '-')

// Controller identity fields show a clear missing-marker when absent (same pattern
// as the legal placeholders), so a gap is visible rather than silently blank.
const CONTROLLER_MISSING = '[[ חסר - יש להשלים פרטי בעל המאגר ]]'
const ctrl = (s: string | null | undefined) => (s && String(s).trim() ? String(s) : CONTROLLER_MISSING)

export function buildAuditPack(input: AuditPackInput): AuditPack {
  const obs = input.obligations.slice().sort((a, b) => a.id.localeCompare(b.id))

  // ---- fingerprint inputs: the assembled ledger facts, NOT the generated-at ----
  const fpInputs = {
    org: { name: input.org.name, businessId: input.org.businessId ?? null, address: input.org.address ?? null },
    score: input.score,
    obligations: obs.map((o) => ({
      id: o.id, status: o.status, severity: o.severity,
      rule: o.sourceRuleId, ruleVersion: o.sourceVersion,
      statusChangedAt: o.statusChangedAt,
      provenance: o.provenance ? { name: o.provenance.name, confidence: o.provenance.confidence } : null,
      evidence: o.evidence.map((e) => ({ kind: e.kind, capturedAt: e.capturedAt, capturedVia: e.capturedVia, ref: e.ref })),
      control: o.control ? { cadence: o.control.cadence, nextDueAt: o.control.nextDueAt, lastCompletedAt: o.control.lastCompletedAt } : null,
    })),
    documents: input.documents.map((x) => ({ type: x.type, version: x.version, approvedAt: x.approvedAt, fingerprint: x.fingerprint })),
  }
  const fingerprint = hashStr(canonical(fpInputs))

  // ---- markdown snapshot ----
  const lines: string[] = []
  lines.push(`# תיק היערכות (Audit Pack)`)
  lines.push('')
  lines.push(`## בעל המאגר`)
  lines.push(`**שם:** ${d(input.org.name)}`)
  lines.push(`**מספר ארגון (ח.פ./ע.מ.):** ${ctrl(input.org.businessId)}`)
  lines.push(`**כתובת:** ${ctrl(input.org.address)}`)
  if (input.dpoName) lines.push(`**ממונה הגנת הפרטיות:** ${d(input.dpoName)}`)
  lines.push(`**ציון ציות:** ${input.score == null ? '-' : input.score}`)
  lines.push(`**הופק:** ${d(input.generatedAtIso)}`)
  lines.push(`**טביעת אצבע של התיק:** ${fingerprint}`)
  lines.push('')
  lines.push(`## חובות (${obs.length})`)
  for (const o of obs) {
    const st = OBLIGATION_STATUS[o.status]?.label ?? o.status
    const sev = o.severity ? SEVERITY[o.severity]?.label ?? o.severity : '-'
    lines.push('')
    lines.push(`### ${d(o.title)}`)
    lines.push(`- סטטוס: ${st} · חומרה: ${sev}`)
    lines.push(`- מקור (provenance): ${o.provenance ? `${o.provenance.name}${o.provenance.sourceTierLabel ? ' · ' + o.provenance.sourceTierLabel : ''}${o.provenance.confidence != null ? ' · ביטחון ' + Math.round(o.provenance.confidence * 100) + '%' : ''}` : (o.sourceRuleId ? `כלל ${o.sourceRuleId}` : 'ידני')}`)
    if (o.statusChangedAt) lines.push(`- שינוי סטטוס אחרון: ${o.statusChangedAt}`)
    lines.push(`- ראיות (${o.evidence.length}):`)
    if (o.evidence.length) {
      for (const e of o.evidence) lines.push(`  - ${d(e.kind)} · נאסף ${d(e.capturedAt)} · דרך ${d(e.capturedVia)} · מקור ${d(e.ref)}`)
    } else {
      lines.push(`  - (אין ראיות)`)
    }
    if (o.control) lines.push(`- בקרה: ${d(o.control.name)} · ${d(o.control.cadence)} · הושלם ${d(o.control.lastCompletedAt)} · הבא ${d(o.control.nextDueAt)}`)
  }
  lines.push('')
  lines.push(`## מסמכים מאושרים (${input.documents.length})`)
  if (input.documents.length) {
    for (const x of input.documents) lines.push(`- ${d(x.title)} · גרסה ${x.version ?? '-'} · אושר ${d(x.approvedAt)} · טביעת אצבע ${d(x.fingerprint)}`)
  } else {
    lines.push(`- (אין מסמכים מאושרים)`)
  }

  const summary: AuditPackSummary = {
    obligations: obs.length,
    evidence: obs.reduce((n, o) => n + o.evidence.length, 0),
    controls: obs.filter((o) => o.control).length,
    documents: input.documents.length,
  }
  return { content: lines.join('\n'), fingerprint, summary }
}
