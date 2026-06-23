// =============================================================================
// Evaluator persistence path - turn ObligationSpec[] into an idempotent upsert.
//
// Pure SQL builder (no IO): the caller executes the returned statement against
// the DB. Idempotency relies on the partial unique index from migration 038
// (org_id, source_rule_id WHERE source_rule_id IS NOT NULL): re-running the
// evaluator updates the same obligation row instead of creating a duplicate.
//
// On conflict we refresh the denormalized-from-rule fields (source_version,
// title, description, severity) and updated_at, but DO NOT touch status,
// opened_at, or triggered_by - those carry the obligation's own lifecycle and
// must survive re-evaluation.
// =============================================================================

import type { ObligationSpec } from './evaluator'

function lit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

export function buildObligationUpsertSql(specs: ObligationSpec[]): string {
  if (specs.length === 0) return ''
  const values = specs
    .map(
      (s) =>
        `  (${lit(s.orgId)}, ${lit(s.sourceRuleId)}, ${s.sourceVersion}, ${lit(s.title)}, ${lit(s.description)}, ${lit(s.severity)}, ${lit(s.status)}, ${lit(s.triggeredBy)})`,
    )
    .join(',\n')
  return `INSERT INTO public.obligations
  (org_id, source_rule_id, source_version, title, description, severity, status, triggered_by)
VALUES
${values}
ON CONFLICT (org_id, source_rule_id) WHERE source_rule_id IS NOT NULL
DO UPDATE SET
  source_version = EXCLUDED.source_version,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  severity = EXCLUDED.severity,
  updated_at = now();`
}
