// =============================================================================
// Pure row -> A4-component-props mapping for the DPO console.
// No IO, no clock: the caller passes the fetched rows and `nowIso` (for overdue).
// Exported pure so the verify test can run it against real דיפו rows.
// =============================================================================
import type { ObligationView } from '@/components/ledger/ObligationRow'
import type { ControlScheduleItemProps } from '@/components/ledger/ControlScheduleItem'
import type { TimelineEvent } from '@/components/ledger/EventTimeline'
import type { ObligationStatus, Severity, Cadence, ControlStatus, EntityType } from '@/components/ledger/status'

// Shapes as read from the ledger tables (subset of columns the console displays).
export interface ObligationDbRow {
  id: string
  title: string
  status: ObligationStatus
  severity: Severity | null
  source_rule_id: string | null
  source_version: number | null
  recurs_at: string | null
}

export interface ControlDbRow {
  source_playbook_id: string
  source_playbook_version: number
  cadence: Cadence
  next_due_at: string | null
  owner_role: string | null
  status: ControlStatus
}

export interface PlaybookDbRow {
  template_id: string
  version: number
  name: string
}

export function mapObligation(r: ObligationDbRow): ObligationView {
  return {
    title: r.title,
    status: r.status,
    severity: r.severity,
    sourceRuleId: r.source_rule_id,
    sourceVersion: r.source_version,
    recursAt: r.recurs_at,
  }
}

export function mapObligations(rows: ObligationDbRow[]): ObligationView[] {
  return rows.map(mapObligation)
}

// Control names live on hub_control_playbooks; join by (template_id, version).
export function mapControls(controls: ControlDbRow[], playbooks: PlaybookDbRow[], nowIso: string): ControlScheduleItemProps[] {
  const now = new Date(nowIso).getTime()
  const nameOf = (id: string, v: number) => playbooks.find((p) => p.template_id === id && p.version === v)?.name ?? 'בקרה'
  return controls.map((c) => ({
    name: nameOf(c.source_playbook_id, c.source_playbook_version),
    cadence: c.cadence,
    nextDueAt: c.next_due_at,
    ownerRole: c.owner_role,
    status: c.status,
    overdue: c.next_due_at ? new Date(c.next_due_at).getTime() < now : false,
  }))
}

// ---------------------------------------------------------------------------
// C2 - obligation detail mappers (pure).
// ---------------------------------------------------------------------------

// Catalog-governance labels (hub_gap_rules.source_tier). Kept here, NOT in the
// ledger status.ts, which is ledger-status only.
export const SOURCE_TIER_LABEL: Record<string, string> = {
  legal: 'הוראת חוק',
  regulatory_guidance: 'הנחיית רגולטור',
  industry_norm: 'נורמה בענף',
  expert_judgment: 'שיפוט מומחה',
}

export interface ObligationDetailDbRow extends ObligationDbRow {
  description: string | null
  triggered_by: string | null
  opened_at: string | null
  status_changed_at: string | null
  closed_at: string | null
  fulfilled_by_control_id: string | null
}

export interface ObligationDetailView extends ObligationView {
  id: string
  description: string | null
  triggeredBy: string | null
  openedAt: string | null
  statusChangedAt: string | null
  closedAt: string | null
  fulfilledByControlId: string | null
}

export function mapObligationDetail(r: ObligationDetailDbRow): ObligationDetailView {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    severity: r.severity,
    sourceRuleId: r.source_rule_id,
    sourceVersion: r.source_version,
    recursAt: r.recurs_at,
    description: r.description,
    triggeredBy: r.triggered_by,
    openedAt: r.opened_at,
    statusChangedAt: r.status_changed_at,
    closedAt: r.closed_at,
    fulfilledByControlId: r.fulfilled_by_control_id,
  }
}

export interface EventDbRow {
  entity_type: EntityType
  event_type: string
  actor: string | null
  created_at: string
  data: Record<string, unknown> | null
}

export function mapEvents(rows: EventDbRow[]): TimelineEvent[] {
  return rows.map((e) => ({
    entityType: e.entity_type,
    eventType: e.event_type,
    summary: typeof e.data?.summary === 'string' ? (e.data.summary as string) : undefined,
    actor: e.actor,
    at: e.created_at,
  }))
}

export interface EvidenceDbRow {
  kind: string
  document_id: string | null
  answer_ref: string | null
  captured_at: string | null
  captured_via: string | null
}

export interface EvidenceView {
  kind: string
  capturedAt: string | null
  capturedVia: string | null
  ref: string | null
}

export function mapEvidence(rows: EvidenceDbRow[]): EvidenceView[] {
  return rows.map((e) => ({
    kind: e.kind,
    capturedAt: e.captured_at,
    capturedVia: e.captured_via,
    ref: e.document_id ?? e.answer_ref ?? null,
  }))
}

export interface RuleDbRow {
  name: string
  severity: Severity | null
  source_tier: string | null
  confidence: number | null
  remediation_text: string | null
}

export interface RuleProvenanceView {
  name: string
  severity: Severity | null
  sourceTier: string | null
  sourceTierLabel: string | null
  confidence: number | null
  remediation: string | null
}

export function mapRuleProvenance(r: RuleDbRow): RuleProvenanceView {
  return {
    name: r.name,
    severity: r.severity,
    sourceTier: r.source_tier,
    sourceTierLabel: r.source_tier ? SOURCE_TIER_LABEL[r.source_tier] ?? r.source_tier : null,
    confidence: r.confidence,
    remediation: r.remediation_text,
  }
}
