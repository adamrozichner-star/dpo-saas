// Skill interface. Each skill is one tool Claude can invoke during an agent
// run. Skills are stateless modules; per-invocation state (orgId, persona,
// runId) lives in the SkillContext passed at handler-call time.
//
// `step: any | null` is intentional — wiring strict Inngest step types here
// would couple every skill module to Inngest internals. The runtime passes
// the step from the Inngest function or null when invoking directly (tests,
// future scripts).

import type { z } from 'zod';

export interface SkillContext {
  orgId: string;
  personaSlug: string;
  runId: string;
  step: unknown | null;
}

// JSON-schema shape matches the Anthropic SDK's Tool.InputSchema — root
// must be type: 'object', with optional properties and other JSON Schema
// keys. Keeping the literal `'object'` at the type level catches drift.
export interface SkillInputSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  [k: string]: unknown;
}

export interface SkillDefinition {
  name: string;
  description: string;
  input_schema: SkillInputSchema;
  inputZodSchema: z.ZodTypeAny;
  isSideEffecting: boolean;
}

export type SkillHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  ctx: SkillContext,
) => Promise<TOutput>;

export interface Skill<TInput = unknown, TOutput = unknown> {
  definition: SkillDefinition;
  handler: SkillHandler<TInput, TOutput>;
}

// Heterogeneous-registry-friendly alias. Individual skill modules still
// keep tight Input/Output generics for in-module type-safety; the registry
// type-erases so a Record<string, AnySkill> can hold skills with different
// signatures without contravariance complaints.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySkill = Skill<any, any>;
