// buildAgentContext — assembles everything a Claude tool-use loop needs:
// system prompt (resolved by persona.system_prompt_key from src/lib/
// system-prompts.ts, with a placeholder fallback so phase 2 can run before
// the Dana/Yossi/Tamar persona prompts exist), org snapshot, org_facts
// snapshot (top 50 most recent), initial user messages, and tool defs.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ToolsBetaMessageParam } from '@anthropic-ai/sdk/resources/beta/tools/messages';
import { getPersona } from '@/lib/agents/registry';
import { getToolDefinitions, ToolDefinitionForClaude } from '@/lib/agents/skills';
import * as SystemPrompts from '@/lib/system-prompts';
import type { Persona } from '@/lib/types/agents';

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface AgentContext {
  org: { id: string; name: string };
  persona: Persona;
  systemPrompt: string;
  initialMessages: ToolsBetaMessageParam[];
  tools: ToolDefinitionForClaude[];
}

export interface AgentTrigger {
  type: 'cron' | 'event' | 'user';
  payload?: unknown;
}

function resolveSystemPrompt(persona: Persona): string {
  const key = persona.systemPromptKey;
  const value = (SystemPrompts as unknown as Record<string, unknown>)[key];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  // Placeholder so Phase 2 can be smoke-tested before Phase 3 ships the
  // real persona prompts. Phase 3 should add DANA_SYSTEM_PROMPT etc. to
  // src/lib/system-prompts.ts and this fallback will no longer fire.
  return `[Persona prompt not yet implemented — this is a placeholder.] You are ${persona.displayNameHe}, ${persona.roleHe}. Your domains of ownership are: ${persona.domainOwnership.join(', ')}. You have access to tools for reading and writing organization facts, your private scratchpad, and creating user-visible notifications. Respond in Hebrew unless the user writes in English.`;
}

export async function buildAgentContext(
  orgId: string,
  personaSlug: string,
  trigger: AgentTrigger,
): Promise<AgentContext> {
  const persona = await getPersona(personaSlug);

  const supabase = serviceSupabase();

  const { data: orgRow, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single();
  if (orgErr || !orgRow) {
    throw new Error(`buildAgentContext: org ${orgId} not found: ${orgErr?.message ?? 'no row'}`);
  }

  const { data: factsRows, error: factsErr } = await supabase
    .from('org_facts')
    .select('fact_key, fact_value, source, confidence, last_verified_at')
    .eq('org_id', orgId)
    .order('last_verified_at', { ascending: false })
    .limit(50);
  if (factsErr) {
    throw new Error(`buildAgentContext: load facts: ${factsErr.message}`);
  }
  const facts = factsRows ?? [];

  const systemPrompt = resolveSystemPrompt(persona);

  const orgContextLines = [
    `# Org snapshot`,
    `id: ${orgRow.id}`,
    `name: ${orgRow.name}`,
    facts.length > 0
      ? `\n## Known facts (most recent first, up to 50)\n${facts
          .map(f => `- ${f.fact_key} = ${JSON.stringify(f.fact_value)} (source=${f.source}, confidence=${f.confidence})`)
          .join('\n')}`
      : '\n## Known facts\n(none yet)',
  ].join('\n');

  const triggerContextLines = [
    `# Trigger`,
    `type: ${trigger.type}`,
    trigger.payload !== undefined
      ? `payload:\n\`\`\`json\n${JSON.stringify(trigger.payload, null, 2)}\n\`\`\``
      : '(no payload)',
  ].join('\n');

  const initialMessages: ToolsBetaMessageParam[] = [
    { role: 'user', content: orgContextLines },
    { role: 'user', content: triggerContextLines },
  ];

  return {
    org: { id: orgRow.id as string, name: orgRow.name as string },
    persona,
    systemPrompt,
    initialMessages,
    tools: getToolDefinitions(),
  };
}
