// =============================================================================
// The evaluator - deterministic core of the Five-C "Classify" step.
//
// For one client's facts and the active hub_gap_rules, decide which rules fire
// and produce the obligations rows that should exist. Pure: no IO, no LLM, no
// clock. Persistence (upsert into the obligations table) and fact loading live
// in the caller (e.g. the dry-run script and, later, the agent-invoke trigger).
//
// Provenance (CC-4): every produced obligation carries source_rule_id +
// source_version = the catalog rule (template_id, version) that minted it.
// =============================================================================

import { safeParseRuleDsl, evaluateCondition } from './dsl'
import type { Facts } from './facts'

export type GapSeverity = 'info' | 'warning' | 'critical'

// One active catalog rule, as the evaluator needs it (subset of hub_gap_rules).
export interface GapRuleInput {
  templateId: string
  version: number
  name: string
  description: string
  severity: GapSeverity
  assetTemplateId?: string | null
  ruleDsl: unknown
}

// One obligations row the evaluator would mint/keep for the org. Maps 1:1 to
// the migration-037 columns the evaluator owns; status is 'checking' on mint
// (it applies; the Collect stage then determines whether it is already met).
export interface ObligationSpec {
  orgId: string
  sourceRuleId: string // -> hub_gap_rules.template_id
  sourceVersion: number // -> hub_gap_rules.version
  title: string
  description: string
  severity: GapSeverity
  status: 'checking'
  triggeredBy: 'gap_rule'
}

export interface RuleError {
  templateId: string
  version: number
  error: string
}

export interface EvaluationResult {
  orgId: string
  fired: ObligationSpec[]
  notFired: Array<{ templateId: string; version: number; name: string }>
  errors: RuleError[]
}

export function evaluateRules(orgId: string, facts: Facts, rules: GapRuleInput[]): EvaluationResult {
  const fired: ObligationSpec[] = []
  const notFired: EvaluationResult['notFired'] = []
  const errors: RuleError[] = []

  for (const rule of rules) {
    const parsed = safeParseRuleDsl(rule.ruleDsl)
    if (!parsed.ok) {
      // A malformed rule never mints an obligation; it is reported instead.
      errors.push({ templateId: rule.templateId, version: rule.version, error: parsed.error })
      continue
    }
    if (evaluateCondition(parsed.condition, facts)) {
      fired.push({
        orgId,
        sourceRuleId: rule.templateId,
        sourceVersion: rule.version,
        title: rule.name,
        description: rule.description,
        severity: rule.severity,
        status: 'checking',
        triggeredBy: 'gap_rule',
      })
    } else {
      notFired.push({ templateId: rule.templateId, version: rule.version, name: rule.name })
    }
  }

  return { orgId, fired, notFired, errors }
}
