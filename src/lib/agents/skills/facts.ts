// org_facts skills — shared knowledge layer any persona can read or write.
// Write source is always set to the calling persona's slug so we can
// attribute fact provenance later.

import { z } from 'zod';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Skill } from './types';

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// fact keys are lowercase namespaces.with.dots — enforced at write time so
// the keyspace stays consistent across personas
const FACT_KEY_REGEX = /^[a-z][a-z0-9_.]*$/;

// -----------------------------------------------------------------------------
// read_org_facts
// -----------------------------------------------------------------------------

const ReadInput = z.object({
  keys: z.array(z.string().min(1)).min(1).max(50),
});

export const readOrgFacts: Skill<z.infer<typeof ReadInput>, Record<string, unknown>> = {
  definition: {
    name: 'read_org_facts',
    description:
      "Read one or more shared organization facts. Returns an object keyed by fact_key; missing keys are simply absent from the response. Use this to look up things any persona has previously established about the org (e.g. 'dpo.contact_email', 'cameras.last_scan_at', 'compliance.score').",
    input_schema: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of fact_key strings to look up.',
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
      .from('org_facts')
      .select('fact_key, fact_value')
      .eq('org_id', ctx.orgId)
      .in('fact_key', input.keys);
    if (error) {
      throw new Error(`read_org_facts: ${error.message}`);
    }
    const result: Record<string, unknown> = {};
    for (const row of data ?? []) {
      result[row.fact_key as string] = row.fact_value;
    }
    return result;
  },
};

// -----------------------------------------------------------------------------
// write_org_fact
// -----------------------------------------------------------------------------

const WriteInput = z.object({
  key: z.string().regex(FACT_KEY_REGEX, 'fact_key must be lowercase a-z, 0-9, dot, underscore; start with a letter'),
  value: z.unknown(),
  confidence: z.number().min(0).max(1).optional(),
});

export const writeOrgFact: Skill<z.infer<typeof WriteInput>, { ok: true }> = {
  definition: {
    name: 'write_org_fact',
    description:
      "Write or update a shared organization fact. Use for things that other personas or future runs will need to know (e.g. 'cameras.last_scan_at' = current ISO timestamp). Keys are lowercase with dot-namespaced segments. Optional confidence in [0,1] defaults to 1.0.",
    input_schema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: "Fact key, e.g. 'cameras.count'. Lowercase a-z0-9._ only, must start with a letter.",
        },
        value: {
          description: 'Any JSON-serializable value.',
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Optional confidence score in [0, 1]. Defaults to 1.0.',
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
    const { error } = await supabase.from('org_facts').upsert(
      {
        org_id: ctx.orgId,
        fact_key: input.key,
        fact_value: input.value as unknown,
        source: ctx.personaSlug,
        confidence: input.confidence ?? 1.0,
        last_verified_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'org_id,fact_key' },
    );
    if (error) {
      throw new Error(`write_org_fact: ${error.message}`);
    }
    return { ok: true as const };
  },
};
