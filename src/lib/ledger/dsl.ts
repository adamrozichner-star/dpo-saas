// =============================================================================
// rule_dsl - the deterministic condition language for hub_gap_rules.
//
// A gap rule's rule_dsl expresses ONLY the condition: "when does this
// obligation apply to a client?". The obligation's title / description /
// severity come from the hub_gap_rules row columns, not from here.
//
// Grammar (recursive, JSON):
//   boolean nodes: { all: Condition[] } | { any: Condition[] } | { not: Condition }
//   leaf:          { fact: string, op: LeafOp, value?: unknown }
//
// Evaluation is pure and deterministic - no LLM, no IO, no clock. A missing
// fact evaluates to false for every comparison (and false for "exists"), so a
// partially-filled client profile never throws and never accidentally fires.
// =============================================================================

import { z } from 'zod'

export type LeafOp = 'eq' | 'ne' | 'in' | 'includes' | 'exists' | 'gt' | 'gte' | 'lt' | 'lte'

export type FactValue = string | number | boolean | Array<string | number> | null | undefined

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { fact: string; op: LeafOp; value?: unknown }

const leafSchema = z
  .object({
    fact: z.string().min(1),
    op: z.enum(['eq', 'ne', 'in', 'includes', 'exists', 'gt', 'gte', 'lt', 'lte']),
    value: z.unknown().optional(),
  })
  .strict()

// Recursive schema. parse() throws on malformed rule_dsl, which the evaluator
// treats as a non-firing, reported error (a bad rule never mints an obligation).
export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema).min(1) }).strict(),
    z.object({ any: z.array(conditionSchema).min(1) }).strict(),
    z.object({ not: conditionSchema }).strict(),
    leafSchema,
  ]),
)

export function parseRuleDsl(raw: unknown): Condition {
  return conditionSchema.parse(raw)
}

export function safeParseRuleDsl(raw: unknown): { ok: true; condition: Condition } | { ok: false; error: string } {
  const r = conditionSchema.safeParse(raw)
  return r.success ? { ok: true, condition: r.data } : { ok: false, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }
}

function isNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x)
}

function evaluateLeaf(leaf: { fact: string; op: LeafOp; value?: unknown }, facts: Record<string, FactValue>): boolean {
  const actual = facts[leaf.fact]
  const expected = leaf.value
  switch (leaf.op) {
    case 'exists':
      return actual !== undefined && actual !== null
    case 'eq':
      return actual === expected
    case 'ne':
      return actual !== expected
    case 'in':
      // actual is one of the listed values
      return Array.isArray(expected) && (expected as Array<unknown>).includes(actual as never)
    case 'includes':
      // actual (an array) contains the listed value
      return Array.isArray(actual) && (actual as Array<unknown>).includes(expected as never)
    case 'gt':
      return isNumber(actual) && isNumber(expected) && actual > expected
    case 'gte':
      return isNumber(actual) && isNumber(expected) && actual >= expected
    case 'lt':
      return isNumber(actual) && isNumber(expected) && actual < expected
    case 'lte':
      return isNumber(actual) && isNumber(expected) && actual <= expected
    default:
      return false
  }
}

export function evaluateCondition(node: Condition, facts: Record<string, FactValue>): boolean {
  if ('all' in node) return node.all.every((c) => evaluateCondition(c, facts))
  if ('any' in node) return node.any.some((c) => evaluateCondition(c, facts))
  if ('not' in node) return !evaluateCondition(node.not, facts)
  return evaluateLeaf(node, facts)
}
