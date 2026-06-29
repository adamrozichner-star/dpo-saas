// =============================================================================
// Pure row -> A4-component-props mapping for the DPO console.
// No IO, no clock: the caller passes the fetched rows and `nowIso` (for overdue).
// Exported pure so the verify test can run it against real דיפו rows.
// =============================================================================
import type { ObligationView } from '@/components/ledger/ObligationRow'
import type { ControlScheduleItemProps } from '@/components/ledger/ControlScheduleItem'
import type { TimelineEvent } from '@/components/ledger/EventTimeline'
import type { ObligationStatus, Severity, Cadence, ControlStatus, EntityType, StatusVariant } from '@/components/ledger/status'
import { EVENT_TYPE_LABEL, ACCESS_LINK_PURPOSE, ACCESS_LINK_STATUS, type AccessLinkPurpose, type AccessLinkStatus } from '@/components/ledger/status'

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
    summary: typeof e.data?.summary === 'string' ? (e.data.summary as string) : EVENT_TYPE_LABEL[e.event_type],
    actor: e.actor,
    at: e.created_at,
  }))
}

// A captured access_link submission, extracted from an events row's data jsonb.
// IMPORTANT: q/a are UNTRUSTED external input (a sysadmin types free text into
// the open questions). The renderer MUST escape them - render as plain React
// text children, NEVER dangerouslySetInnerHTML.
export interface SubmittedAnswer {
  q: string
  a: string
}
export interface SubmissionView {
  at: string
  actor: string | null
  answers: SubmittedAnswer[]
}

export function mapSubmissions(rows: EventDbRow[]): SubmissionView[] {
  return rows
    .filter((e) => e.event_type === 'access_link_submitted')
    .map((e) => {
      const raw = e.data?.answers
      const answers: SubmittedAnswer[] = Array.isArray(raw)
        ? (raw as unknown[])
            .map((x) => {
              const o = (x ?? {}) as Record<string, unknown>
              return { q: typeof o.q === 'string' ? o.q : '', a: typeof o.a === 'string' ? o.a : '' }
            })
            .filter((x) => x.q !== '' || x.a !== '')
        : []
      return { at: e.created_at, actor: e.actor, answers }
    })
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

// access_links list row (E2 links management UI). org-scoped by RLS upstream.
export interface AccessLinkDbRow {
  id: string
  purpose: AccessLinkPurpose
  status: AccessLinkStatus
  obligation_id: string | null
  org_display_name: string
  created_at: string
  expires_at: string
  used_at: string | null
}

export interface AccessLinkView {
  id: string
  purpose: AccessLinkPurpose
  purposeLabel: string
  status: AccessLinkStatus
  statusVariant: StatusVariant
  statusLabel: string
  obligationId: string | null
  obligationTitle: string | null
  orgDisplayName: string
  createdAt: string
  expiresAt: string
  usedAt: string | null
  isActive: boolean
}

// Maps a link row + the resolved obligation title. Surfaces time-expiry: a row
// still stored 'active' but past expires_at renders as 'expired' (matching what
// resolve_access_link would do), and only a truly active link can be revoked.
export function mapAccessLink(row: AccessLinkDbRow, obligationTitle: string | null, nowIso: string): AccessLinkView {
  const timeExpired = row.status === 'active' && row.expires_at <= nowIso
  const effective: AccessLinkStatus = timeExpired ? 'expired' : row.status
  const st = ACCESS_LINK_STATUS[effective]
  return {
    id: row.id,
    purpose: row.purpose,
    purposeLabel: ACCESS_LINK_PURPOSE[row.purpose] ?? row.purpose,
    status: effective,
    statusVariant: st.variant,
    statusLabel: st.label,
    obligationId: row.obligation_id,
    obligationTitle,
    orgDisplayName: row.org_display_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    isActive: effective === 'active',
  }
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

// ---------------------------------------------------------------------------
// C3 - DPO judgment queue (dpo_queue). Queue-governance maps + the pure resolve
// write builder. Kept here (not the ledger status.ts) since dpo_queue is its own
// governance surface, not a ledger status.
// ---------------------------------------------------------------------------

export type DpoQueuePriority = 'critical' | 'high' | 'medium' | 'low'
export type DpoQueueStatus = 'pending' | 'in_progress' | 'resolved' | 'auto_resolved' | 'dismissed'
export type DpoQueueType = 'escalation' | 'dsr' | 'incident' | 'review' | 'onboarding' | 'document_expiry' | 'regulator'
export type ResolutionType = 'approved_ai' | 'edited' | 'manual' | 'rejected' | 'auto'

interface VL {
  variant: StatusVariant
  label: string
}

export const DPO_QUEUE_PRIORITY: Record<DpoQueuePriority, VL> = {
  critical: { variant: 'risk', label: 'קריטי' },
  high: { variant: 'warn', label: 'גבוה' },
  medium: { variant: 'info', label: 'בינוני' },
  low: { variant: 'neutral', label: 'נמוך' },
}

export const DPO_QUEUE_STATUS: Record<DpoQueueStatus, VL> = {
  pending: { variant: 'neutral', label: 'ממתין' },
  in_progress: { variant: 'info', label: 'בתהליך' },
  resolved: { variant: 'ok', label: 'טופל' },
  auto_resolved: { variant: 'ok', label: 'טופל אוטומטית' },
  dismissed: { variant: 'neutral', label: 'נדחה' },
}

export const DPO_QUEUE_TYPE_LABEL: Record<DpoQueueType, string> = {
  escalation: 'הסלמה',
  dsr: 'בקשת נושא מידע',
  incident: 'אירוע',
  review: 'סקירה',
  onboarding: 'הצטרפות',
  document_expiry: 'פקיעת מסמך',
  regulator: 'רגולטור',
}

export interface QueueItemDbRow {
  id: string
  type: DpoQueueType
  priority: DpoQueuePriority
  status: DpoQueueStatus
  title: string
  description: string | null
  deadline_at: string | null
}

export interface QueueItemView {
  id: string
  title: string
  description: string | null
  typeLabel: string
  priority: DpoQueuePriority
  status: DpoQueueStatus
  deadlineAt: string | null
  resolved: boolean
}

export function mapQueueItem(r: QueueItemDbRow): QueueItemView {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    typeLabel: DPO_QUEUE_TYPE_LABEL[r.type] ?? r.type,
    priority: r.priority,
    status: r.status,
    deadlineAt: r.deadline_at,
    resolved: r.status === 'resolved' || r.status === 'auto_resolved',
  }
}

export interface ResolveInput {
  itemId: string
  orgId: string
  userId: string
  resolutionType: ResolutionType
  notes: string
  actor: string
  nowIso: string
}

export interface ResolveWrite {
  update: {
    status: 'resolved'
    resolved_at: string
    resolved_by: string
    resolution_type: ResolutionType
    resolution_notes: string
  }
  event: {
    org_id: string
    entity_type: 'dpo_queue'
    entity_id: string
    event_type: 'resolved'
    actor: string
    data: { resolution_type: ResolutionType; notes: string }
  }
}

// Pure: the exact payloads the resolve action writes (dpo_queue UPDATE + the
// append-only events INSERT). The page applies these via the authed client under
// RLS; the verify test asserts them directly.
export function buildResolveWrite(p: ResolveInput): ResolveWrite {
  return {
    update: {
      status: 'resolved',
      resolved_at: p.nowIso,
      resolved_by: p.userId,
      resolution_type: p.resolutionType,
      resolution_notes: p.notes,
    },
    event: {
      org_id: p.orgId,
      entity_type: 'dpo_queue',
      entity_id: p.itemId,
      event_type: 'resolved',
      actor: p.actor,
      data: { resolution_type: p.resolutionType, notes: p.notes },
    },
  }
}

// ---------------------------------------------------------------------------
// C4 - LEDGER_READ flag bridge. When the per-org flag is on, the legacy
// dashboard reads obligation/control state from the ledger instead of the
// recomputed compliance-engine. buildLedgerSummary is PURE; the authed RLS read
// + the legacy call are injected by the caller (so the switch is testable).
//
// PARTIAL view: obligations + score are ledger-backed; the ancillary stats
// (securityLevel, needsReporting, totalRecords, dbCount, needsCiso) are NEUTRAL
// defaults, NOT yet ledger-backed. Flag-on is therefore not yet a full
// replacement for the legacy engine (see tasks/lessons.md / PR12).
// ---------------------------------------------------------------------------
import type { ComplianceSummary, ComplianceTask } from '@/lib/compliance-engine'
import { RULE_STAT_IMPACT } from '@/lib/ledger/seed-rules'

export function isLedgerRead(org: { feature_flags?: Record<string, unknown> | null } | null | undefined): boolean {
  return org?.feature_flags?.LEDGER_READ === true
}

// E4 - DSAR_PASSTHROUGH per-org flag (mirrors LEDGER_READ). When ON, the DPO can
// mint tokenized DSAR intake links (the PII-free pass-through). When OFF (the
// default - flag absent), the legacy /rights + /api/rights path stays the only
// DSAR surface, fully unchanged.
export function isDsarPassthrough(org: { feature_flags?: Record<string, unknown> | null } | null | undefined): boolean {
  return org?.feature_flags?.DSAR_PASSTHROUGH === true
}

export interface LedgerSummaryObligation {
  id: string
  title: string
  status: ObligationStatus
  severity: Severity | null
  description?: string | null
  sourceRuleId?: string | null // PR12: which gap rule minted it (-> RULE_STAT_IMPACT)
}

// PR12: db/record counts the legacy engine derived from onboarding, now read from
// the v3 ledger (org_descriptors, populated by the F2d copy).
export interface LedgerDescriptorCounts {
  db_count: number
  total_records: number
}

const SEVERITY_TO_PRIORITY: Record<Severity, ComplianceTask['priority']> = {
  critical: 'critical',
  warning: 'high',
  info: 'medium',
}

function obligationToTask(o: LedgerSummaryObligation, index: number): ComplianceTask {
  return {
    id: o.id,
    title: o.title,
    description: o.description ?? '',
    legalBasis: '',
    icon: '',
    priority: o.severity ? SEVERITY_TO_PRIORITY[o.severity] : 'medium',
    status: o.status === 'compliant' ? 'completed' : 'needs_action',
    actionType: 'doc_review', // passive: expand-only, no generate/wizard/mark-done
    sortOrder: index,
  }
}

// Pure: ledger obligations + score -> a ComplianceSummary the existing dashboard
// PR12: derive the ancillary stats from the ledger - securityLevel / needsReporting
// / needsCiso from obligation provenance (RULE_STAT_IMPACT), db/record counts from
// org_descriptors. An obligation whose source rule has no impact entry, or no
// descriptor row, yields the safe default (basic / false / 0). No neutral
// hardcoding - all five are ledger-derived. (securityLevel is high|basic by
// design; the legacy 'medium' count-heuristic is intentionally not reconstructed.)
export function deriveLedgerStats(obligations: LedgerSummaryObligation[], descriptor: LedgerDescriptorCounts | null) {
  let securityHigh = false
  let needsCiso = false
  const reportingReasons: string[] = []
  for (const o of obligations) {
    const impact = o.sourceRuleId ? RULE_STAT_IMPACT[o.sourceRuleId] : undefined
    if (!impact) continue
    if (impact.securityHigh) securityHigh = true
    if (impact.needsCiso) needsCiso = true
    if (impact.needsReporting) reportingReasons.push(o.title)
  }
  return {
    securityLevel: (securityHigh ? 'high' : 'basic') as 'basic' | 'medium' | 'high',
    securityLevelHe: securityHigh ? 'גבוהה' : 'בסיסית',
    needsReporting: reportingReasons.length > 0,
    reportingReasons,
    needsCiso,
    dbCount: descriptor?.db_count ?? 0,
    totalRecords: descriptor?.total_records ?? 0,
  }
}

// Ledger-derived compliance score (0-100). The score is the share of obligation
// "weight" already in order, weighted by severity so an open critical hurts more
// than an open warning. PURE - derived live from the obligations, so the dial
// MOVES as the loop runs (an obligation turning 'compliant' raises it). No org
// with zero obligations is penalised (nothing to comply with -> 100).
// NOTE: the severity weights are a PROVISIONAL engineering default (Amir/Roy own
// the real scoring), mirroring the dial's PROVISIONAL band thresholds.
export interface ScoreObligation {
  status: ObligationStatus
  severity: Severity | null
}
const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 3, warning: 2, info: 1 }

export function scoreFromObligations(obligations: ScoreObligation[]): number {
  if (obligations.length === 0) return 100
  let total = 0
  let met = 0
  for (const o of obligations) {
    const w = o.severity ? SEVERITY_WEIGHT[o.severity] : 1
    total += w
    if (o.status === 'compliant') met += w
  }
  return total === 0 ? 100 : Math.round((met / total) * 100)
}

// UI renders unchanged. Ancillary stats are ledger-derived (PR12).
export function buildLedgerSummary(obligations: LedgerSummaryObligation[], score: number, descriptor: LedgerDescriptorCounts | null = null): ComplianceSummary {
  const stats = deriveLedgerStats(obligations, descriptor)
  return {
    tasks: obligations.map(obligationToTask),
    actions: [],
    guidelines: [],
    score,
    securityLevel: stats.securityLevel,
    securityLevelHe: stats.securityLevelHe,
    totalRecords: stats.totalRecords,
    dbCount: stats.dbCount,
    needsReporting: stats.needsReporting,
    reportingReasons: stats.reportingReasons,
    needsCiso: stats.needsCiso,
  }
}

// The data-source switch. Pure with injected deps so it is fully testable:
// flag OFF returns legacy() verbatim and never touches the ledger; flag ON builds
// from the ledger and never calls legacy().
export async function loadComplianceSummary(opts: {
  ledgerRead: boolean
  fetchObligations: () => Promise<LedgerSummaryObligation[]>
  score: number
  legacy: () => ComplianceSummary
  // PR12: optional ledger descriptor counts (db_count/total_records) for the
  // flag-ON path. Absent -> 0 (safe). The flag-OFF path never touches it.
  fetchDescriptor?: () => Promise<LedgerDescriptorCounts | null>
}): Promise<ComplianceSummary> {
  if (opts.ledgerRead) {
    const descriptor = opts.fetchDescriptor ? await opts.fetchDescriptor() : null
    return buildLedgerSummary(await opts.fetchObligations(), opts.score, descriptor)
  }
  return opts.legacy()
}

// ---------------------------------------------------------------------------
// D2 - owner light app. Pure mapper from ledger state to a warm, plain-language
// owner home. Owner-governance (kept here, not status.ts). It deliberately takes
// ONLY obligation statuses (counts) + owner-assigned task titles - never the raw
// obligation titles, severities, or provenance - so no jargon can leak to the owner.
// ---------------------------------------------------------------------------

export interface OwnerObligationStatusRow {
  status: ObligationStatus
}
export interface OwnerTaskRow {
  title: string
}
export interface OwnerActionItem {
  title: string
}
export interface OwnerHomeView {
  handlingCount: number
  sortedCount: number
  needsYou: OwnerActionItem[]
  allClear: boolean
  headline: string
  reassurance: string
  humanTouch: string
  vendorDpaGap: number
  vendorDpaNote: string | null
}

// vendorDpaGap = count of the org's recipients without a signed processing
// commitment (data_recipients.has_dpa = false) - the SAME gap the DPO sees in the
// DPA document. Roy (2026-06-29): this gap must be visible to the client too, so we
// surface it plainly here. Plain language only: no jargon may leak to the owner
// (the term הסכם עיבוד is banned in owner copy), hence "התחייבות לשמירה על המידע".
export function buildOwnerHome(
  obligations: OwnerObligationStatusRow[],
  ownerTasks: OwnerTaskRow[],
  vendorDpaGap = 0,
): OwnerHomeView {
  const handlingCount = obligations.length
  const sortedCount = obligations.filter((o) => o.status === 'compliant').length
  const needsYou: OwnerActionItem[] = ownerTasks.map((t) => ({ title: t.title }))
  const allClear = needsYou.length === 0

  // DRAFT COPY - Adam to tune for brand voice. The mechanism is what we verify;
  // the exact wording is a brand-voice call. Rules: warm, first-person Hebrew,
  // no emoji, sentence case, no מערכות/רשומות, Deepo capital-D, one human touch.
  const headline = allClear ? 'הכל תחת שליטה' : 'יש כמה דברים שמחכים לך'
  const reassurance =
    handlingCount === 0
      ? 'אין כרגע נושאי פרטיות פתוחים, הכל מעודכן.'
      : sortedCount > 0
        ? `Deepo מטפלת ב-${handlingCount} נושאי פרטיות עבורך, ${sortedCount} כבר מסודרים.`
        : `Deepo מטפלת ב-${handlingCount} נושאי פרטיות עבורך.`
  const humanTouch = 'קחו נשימה, אנחנו על זה.'

  // DRAFT COPY - Adam to tune. Warm, plain, no jargon (no הסכם עיבוד).
  const vendorDpaNote =
    vendorDpaGap <= 0
      ? null
      : vendorDpaGap === 1
        ? 'יש ספק אחד שעדיין לא הסדיר התחייבות לשמירה על המידע שלך. אנחנו עוקבים אחרי זה.'
        : `יש ${vendorDpaGap} ספקים שעדיין לא הסדירו התחייבות לשמירה על המידע שלך. אנחנו עוקבים אחרי זה.`

  return { handlingCount, sortedCount, needsYou, allClear, headline, reassurance, humanTouch, vendorDpaGap, vendorDpaNote }
}
