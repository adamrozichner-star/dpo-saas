// agent_scratchpad skills — per-persona internal reasoning store. Each
// persona has its own keyspace (Dana's scratchpad ≠ Yossi's scratchpad);
// the persona_slug is taken from SkillContext, never accepted as input,
// so a persona cannot accidentally read another persona's notes.

import { z } from 'zod';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Skill } from './types';

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const SCRATCH_KEY_REGEX = /^[a-z][a-z0-9_.]*$/;

// -----------------------------------------------------------------------------
// read_scratchpad
// -----------------------------------------------------------------------------

const ReadInput = z.object({
  keys: z.array(z.string().min(1)).min(1).max(50),
});

export const readScratchpad: Skill<z.infer<typeof ReadInput>, Record<string, unknown>> = {
  definition: {
    name: 'read_scratchpad',
    description:
      "Read your own scratchpad entries. Each entry is private to your persona. Use for personal working memory (e.g. 'pending_review_cameras', 'last_scan_findings'). Missing keys are simply absent from the response.",
    input_schema: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Scratch keys to look up.',
          minItems: 1,
          maxItems: 50,
        },
      },
      required: ['keys'],
    },
    inputZodSchema: ReadInput,
    isSideEffecting: false,
  },
  handler: async (input, ctx) => {
    const supabase = serviceSupabase();
    const { data, error } = await supabase
      .from('agent_scratchpad')
      .select('scratch_key, scratch_value')
      .eq('org_id', ctx.orgId)
      .eq('persona_slug', ctx.personaSlug)
      .in('scratch_key', input.keys);
    if (error) {
      throw new Error(`read_scratchpad: ${error.message}`);
    }
    const result: Record<string, unknown> = {};
    for (const row of data ?? []) {
      result[row.scratch_key as string] = row.scratch_value;
    }
    return result;
  },
};

// -----------------------------------------------------------------------------
// write_scratchpad
// -----------------------------------------------------------------------------

const WriteInput = z.object({
  key: z.string().regex(SCRATCH_KEY_REGEX, 'scratch_key must be lowercase a-z, 0-9, dot, underscore; start with a letter'),
  value: z.unknown(),
});

export const writeScratchpad: Skill<z.infer<typeof WriteInput>, { ok: true }> = {
  definition: {
    name: 'write_scratchpad',
    description:
      "Write a private scratchpad entry. Use for your own working memory between runs. The entry is automatically scoped to your persona; other personas cannot read or write it.",
    input_schema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: "Scratch key, e.g. 'pending_review_cameras'. Lowercase a-z0-9._ only, must start with a letter.",
        },
        value: {
          description: 'Any JSON-serializable value.',
        },
      },
      required: ['key', 'value'],
    },
    inputZodSchema: WriteInput,
    isSideEffecting: true,
  },
  handler: async (input, ctx) => {
    const supabase = serviceSupabase();
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('agent_scratchpad').upsert(
      {
        org_id: ctx.orgId,
        persona_slug: ctx.personaSlug,
        scratch_key: input.key,
        scratch_value: input.value as unknown,
        updated_at: nowIso,
      },
      { onConflict: 'org_id,persona_slug,scratch_key' },
    );
    if (error) {
      throw new Error(`write_scratchpad: ${error.message}`);
    }
    return { ok: true as const };
  },
};
