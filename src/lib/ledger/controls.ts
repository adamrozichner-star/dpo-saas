// =============================================================================
// Control instantiation + obligation linkage (B3, the Five-C "Control" step).
//
// Instantiate hub_control_playbooks into per-org controls, link each control to
// the obligations it satisfies (obligations.fulfilled_by_control_id), and set
// obligations.recurs_at = the control's next_due_at. Deterministic, no LLM.
//
// One control per (org, playbook): several obligations can share one control
// (e.g. both PPA obligations share the annual PPA review). Idempotency relies on
// the migration-039 unique index (org_id, source_playbook_id, source_playbook_version).
//
// CADENCE LIMITATION (tracked in tasks/lessons.md): the cadence enum
// (daily..annual) cannot express the real regulatory cadences (18 months,
// 2 years). B3 only seeds annual controls; the 18mo/2yr controls need a
// cadence_months migration before they can be authored.
// =============================================================================

export type ControlCadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual'

// biannual = every 6 months (semi-annual), per its position between quarterly and annual.
export const CADENCE_MONTHS: Record<ControlCadence, number> = {
  daily: 0,
  weekly: 0,
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
}

export interface PlaybookInput {
  templateId: string
  version: number
  assetTemplateId: string
  name: string
  description: string
  cadence: ControlCadence
  ownerRole: string | null
  checklist: unknown[]
}

// An obligation to consider for control linkage (subset of the obligations row).
export interface ObligationRef {
  sourceRuleId: string
}

// One control to upsert for the org, plus the rules whose obligations it satisfies.
export interface ControlPlan {
  orgId: string
  playbookTemplateId: string
  playbookVersion: number
  cadence: ControlCadence
  ownerRole: string | null
  nextDueAtIso: string
  ruleTemplateIds: string[]
}

function addMonthsIso(from: Date, months: number): string {
  const d = new Date(from.getTime())
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString()
}

// Pure planner: which controls to create for one org and which obligations each
// satisfies. appliedAt is injected (no internal clock) for determinism.
export function planControls(
  orgId: string,
  obligations: ObligationRef[],
  playbooks: PlaybookInput[],
  ruleToPlaybook: Record<string, string>,
  appliedAt: Date,
): ControlPlan[] {
  const byPlaybook = new Map<string, string[]>() // playbookTemplateId -> ruleTemplateIds
  for (const o of obligations) {
    const pb = ruleToPlaybook[o.sourceRuleId]
    if (!pb) continue
    const list = byPlaybook.get(pb) ?? []
    if (!list.includes(o.sourceRuleId)) list.push(o.sourceRuleId)
    byPlaybook.set(pb, list)
  }
  const plans: ControlPlan[] = []
  for (const [playbookTemplateId, ruleTemplateIds] of Array.from(byPlaybook)) {
    const pb = playbooks.find((p) => p.templateId === playbookTemplateId)
    if (!pb) continue
    plans.push({
      orgId,
      playbookTemplateId,
      playbookVersion: pb.version,
      cadence: pb.cadence,
      ownerRole: pb.ownerRole,
      nextDueAtIso: addMonthsIso(appliedAt, CADENCE_MONTHS[pb.cadence]),
      ruleTemplateIds: ruleTemplateIds.sort(),
    })
  }
  return plans.sort((a, b) => a.playbookTemplateId.localeCompare(b.playbookTemplateId))
}

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`

export function buildPlaybookUpsertSql(playbooks: PlaybookInput[]): string {
  if (playbooks.length === 0) return ''
  const values = playbooks
    .map(
      (p) =>
        `  (${lit(p.templateId)}, ${p.version}, ${lit(p.assetTemplateId)}, ${lit(p.name)}, ${lit(p.description)}, ${lit(p.cadence)}, ${p.ownerRole === null ? 'null' : lit(p.ownerRole)}, ${lit(JSON.stringify(p.checklist))}::jsonb, true, 'expert_judgment'::hub_source_tier, 0.5)`,
    )
    .join(',\n')
  return `INSERT INTO public.hub_control_playbooks
  (template_id, version, asset_template_id, name, description, cadence, owner_role, checklist, active, source_tier, confidence)
VALUES
${values}
ON CONFLICT (template_id, version) DO UPDATE SET
  asset_template_id = EXCLUDED.asset_template_id, name = EXCLUDED.name, description = EXCLUDED.description,
  cadence = EXCLUDED.cadence, owner_role = EXCLUDED.owner_role, checklist = EXCLUDED.checklist,
  active = EXCLUDED.active, source_tier = EXCLUDED.source_tier, confidence = EXCLUDED.confidence, updated_at = now();`
}

// Upsert controls. next_due_at is set on insert and PRESERVED on conflict (the
// schedule is advanced by completion, not by re-instantiation). RETURNING lets
// the caller map (playbook) -> control id for the obligation linkage.
export function buildControlUpsertSql(plans: ControlPlan[]): string {
  if (plans.length === 0) return ''
  const values = plans
    .map(
      (p) =>
        `  (${lit(p.orgId)}, ${lit(p.playbookTemplateId)}, ${p.playbookVersion}, ${lit(p.cadence)}, ${p.ownerRole === null ? 'null' : lit(p.ownerRole)}, ${lit(p.nextDueAtIso)}::timestamptz)`,
    )
    .join(',\n')
  return `INSERT INTO public.controls
  (org_id, source_playbook_id, source_playbook_version, cadence, owner_role, next_due_at)
VALUES
${values}
ON CONFLICT (org_id, source_playbook_id, source_playbook_version) DO UPDATE SET
  cadence = EXCLUDED.cadence, owner_role = EXCLUDED.owner_role, updated_at = now()
RETURNING id, source_playbook_id, source_playbook_version, next_due_at;`
}

// Link every obligation minted by one of ruleTemplateIds (for this org) to the
// control, and set recurs_at = the control's next_due_at.
export function buildObligationLinkSql(orgId: string, controlId: string, ruleTemplateIds: string[], nextDueAtIso: string): string {
  const inList = ruleTemplateIds.map(lit).join(', ')
  return `UPDATE public.obligations
SET fulfilled_by_control_id = ${lit(controlId)}, recurs_at = ${lit(nextDueAtIso)}::timestamptz, updated_at = now()
WHERE org_id = ${lit(orgId)} AND source_rule_id IN (${inList});`
}
