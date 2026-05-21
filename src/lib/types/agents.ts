// TypeScript types + Zod schemas for the hub-and-spoke substrate (migration
// 019). Every persona/run/fact/scratchpad row from the DB should be parsed
// through these schemas at the read boundary so the rest of the app can
// rely on the shapes.

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type TriggerType = 'cron' | 'event' | 'user';
export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export const TriggerTypeSchema = z.enum(['cron', 'event', 'user']);
export const AgentRunStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);

// -----------------------------------------------------------------------------
// Persona
// -----------------------------------------------------------------------------

export interface Persona {
  id: string;
  slug: string;
  displayNameHe: string;
  roleHe: string;
  systemPromptKey: string;
  domainOwnership: string[];
  avatarSeed: string;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Zod parser for the snake_case row shape returned by Supabase. Transforms
// to the camelCase TS shape so consumers don't deal with snake_case.
export const PersonaSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  display_name_he: z.string().min(1),
  role_he: z.string().min(1),
  system_prompt_key: z.string().min(1),
  domain_ownership: z.array(z.string()),
  avatar_seed: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).transform((row): Persona => ({
  id: row.id,
  slug: row.slug,
  displayNameHe: row.display_name_he,
  roleHe: row.role_he,
  systemPromptKey: row.system_prompt_key,
  domainOwnership: row.domain_ownership,
  avatarSeed: row.avatar_seed,
  color: row.color,
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));

// -----------------------------------------------------------------------------
// AgentRun
// -----------------------------------------------------------------------------

export interface AgentRun {
  id: string;
  orgId: string;
  personaSlug: string;
  triggerType: TriggerType;
  triggerPayload: unknown | null;
  status: AgentRunStatus;
  input: unknown;
  output: unknown | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  parentRunId: string | null;
  inngestRunId: string | null;
  createdAt: string;
}

export const AgentRunSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  persona_slug: z.string(),
  trigger_type: TriggerTypeSchema,
  trigger_payload: z.unknown().nullable(),
  status: AgentRunStatusSchema,
  input: z.unknown(),
  output: z.unknown().nullable(),
  error: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  parent_run_id: z.string().uuid().nullable(),
  inngest_run_id: z.string().nullable(),
  created_at: z.string(),
}).transform((row): AgentRun => ({
  id: row.id,
  orgId: row.org_id,
  personaSlug: row.persona_slug,
  triggerType: row.trigger_type,
  triggerPayload: row.trigger_payload,
  status: row.status,
  input: row.input,
  output: row.output,
  error: row.error,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  parentRunId: row.parent_run_id,
  inngestRunId: row.inngest_run_id,
  createdAt: row.created_at,
}));

// -----------------------------------------------------------------------------
// OrgFact
// -----------------------------------------------------------------------------

export interface OrgFact {
  id: string;
  orgId: string;
  factKey: string;
  factValue: unknown;
  source: string;
  confidence: number;
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const OrgFactSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  fact_key: z.string().min(1),
  fact_value: z.unknown(),
  source: z.string().min(1),
  confidence: z.number().min(0).max(1),
  last_verified_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
}).transform((row): OrgFact => ({
  id: row.id,
  orgId: row.org_id,
  factKey: row.fact_key,
  factValue: row.fact_value,
  source: row.source,
  confidence: row.confidence,
  lastVerifiedAt: row.last_verified_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));

// -----------------------------------------------------------------------------
// AgentScratchpad
// -----------------------------------------------------------------------------

export interface AgentScratchpad {
  id: string;
  orgId: string;
  personaSlug: string;
  scratchKey: string;
  scratchValue: unknown;
  createdAt: string;
  updatedAt: string;
}

export const AgentScratchpadSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  persona_slug: z.string(),
  scratch_key: z.string().min(1),
  scratch_value: z.unknown(),
  created_at: z.string(),
  updated_at: z.string(),
}).transform((row): AgentScratchpad => ({
  id: row.id,
  orgId: row.org_id,
  personaSlug: row.persona_slug,
  scratchKey: row.scratch_key,
  scratchValue: row.scratch_value,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));
