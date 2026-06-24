// =============================================================================
// Pure row -> A4-component-props mapping for the DPO console.
// No IO, no clock: the caller passes the fetched rows and `nowIso` (for overdue).
// Exported pure so the verify test can run it against real דיפו rows.
// =============================================================================
import type { ObligationView } from '@/components/ledger/ObligationRow'
import type { ControlScheduleItemProps } from '@/components/ledger/ControlScheduleItem'
import type { ObligationStatus, Severity, Cadence, ControlStatus } from '@/components/ledger/status'

// Shapes as read from the ledger tables (subset of columns the console displays).
export interface ObligationDbRow {
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
