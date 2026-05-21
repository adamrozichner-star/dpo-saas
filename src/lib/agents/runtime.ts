// Agent runtime — the engine that turns (org, persona, trigger) into a
// Claude tool-use loop with streaming state persistence to agent_runs.
//
// Hybrid Inngest step granularity:
//   - Each Claude call is one step.run (network call worth retrying).
//   - Each side-effecting tool execution is one step.run (DB write worth
//     retrying / deduping).
//   - Read-only tool execution runs inline (no value in checkpointing).
//   - Each agent_runs UPDATE is one step.run (idempotent DB write; keeps
//     agent_runs.output queryable mid-flight).
//
// When step is null (direct invocation: tests, ad-hoc scripts) every
// operation runs inline.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import type {
  ToolsBetaMessage,
  ToolsBetaMessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/beta/tools/messages';
import { createToolMessage } from '@/lib/anthropic';
import { buildAgentContext, AgentTrigger } from '@/lib/agents/context';
import { getSkill } from '@/lib/agents/skills';
import type { SkillContext } from '@/lib/agents/skills/types';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_PER_TURN = 4096;
const MAX_TURNS = 10;

export interface InvokeAgentParams {
  orgId: string;
  personaSlug: string;
  trigger: AgentTrigger;
  step?: unknown | null;
  // Optional allowlist of skill names to expose for this invocation. When
  // provided, only matching tools are passed to Claude — useful for
  // read-only smoke tests, sandbox invocations, or per-trigger capability
  // gating. Undefined = no filter (all registered skills available).
  toolNames?: string[];
}

export interface InvokeAgentResult {
  runId: string;
  status: 'completed' | 'failed';
  finalText: string | null;
  toolCalls: number;
  error: string | null;
}

interface InngestStepLike {
  run<T>(stepId: string, fn: () => Promise<T>): Promise<T>;
}

function serviceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Run a side-effecting block through Inngest step.run if available, else inline.
async function maybeStep<T>(
  step: InngestStepLike | null,
  stepId: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (step) return step.run(stepId, fn);
  return fn();
}

function extractFinalText(content: ToolsBetaMessage['content']): string {
  const texts: string[] = [];
  for (const block of content) {
    if (block.type === 'text') texts.push(block.text);
  }
  return texts.join('\n').trim();
}

function findToolUses(content: ToolsBetaMessage['content']): ToolUseBlock[] {
  const uses: ToolUseBlock[] = [];
  for (const block of content) {
    if (block.type === 'tool_use') uses.push(block);
  }
  return uses;
}

export async function invokeAgent(params: InvokeAgentParams): Promise<InvokeAgentResult> {
  const { orgId, personaSlug, trigger, toolNames } = params;
  const step = (params.step ?? null) as InngestStepLike | null;
  const supabase = serviceSupabase();

  console.log(`[agent] starting run org=${orgId} persona=${personaSlug} trigger=${trigger.type}`);

  // 1. Build context
  const ctx = await buildAgentContext(orgId, personaSlug, trigger);

  // Optional capability gate: filter the toolset to an explicit allowlist.
  // Useful for read-only smoke tests or per-trigger sandboxing.
  const tools = toolNames
    ? ctx.tools.filter(t => toolNames.includes(t.name))
    : ctx.tools;
  if (toolNames && tools.length === 0) {
    console.warn(`[agent] toolNames filter produced 0 tools — Claude will have no tools available`);
  }

  // 2. Initial INSERT into agent_runs (status='queued')
  const messages: ToolsBetaMessageParam[] = [...ctx.initialMessages];
  const insertResult = await maybeStep(step, 'insert-agent-run', async () => {
    const { data, error } = await supabase
      .from('agent_runs')
      .insert({
        org_id: orgId,
        persona_slug: personaSlug,
        trigger_type: trigger.type,
        trigger_payload: trigger.payload ?? null,
        status: 'queued',
        input: messages,
      })
      .select('id')
      .single();
    if (error || !data) {
      throw new Error(`agent_runs insert: ${error?.message ?? 'no row'}`);
    }
    return data.id as string;
  });
  const runId: string = insertResult;
  Sentry.addBreadcrumb({
    category: 'agent',
    level: 'info',
    message: 'agent_runs created',
    data: { runId, personaSlug, orgId, trigger: trigger.type },
  });

  // 3. Transition to 'running'
  await maybeStep(step, 'mark-running', async () => {
    const { error } = await supabase
      .from('agent_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', runId);
    if (error) throw new Error(`mark-running: ${error.message}`);
  });

  const skillCtx: SkillContext = { orgId, personaSlug, runId, step };

  let toolCalls = 0;
  let finalText: string | null = null;
  let terminationStatus: 'completed' | 'failed' = 'failed';
  let terminationError: string | null = null;

  try {
    for (let turn = 1; turn <= MAX_TURNS; turn++) {
      console.log(`[agent] runId=${runId} turn=${turn}/${MAX_TURNS}`);

      // 3a. Call Claude (one step per call)
      const response = await maybeStep(step, `claude-call-${turn}`, () =>
        createToolMessage({
          model: MODEL,
          max_tokens: MAX_TOKENS_PER_TURN,
          system: ctx.systemPrompt,
          messages,
          tools,
        }),
      );

      // 3b. Append assistant message to history
      messages.push({ role: 'assistant', content: response.content });

      // 3c. Persist partial state (streaming)
      await maybeStep(step, `persist-run-state-${turn}`, async () => {
        const { error } = await supabase
          .from('agent_runs')
          .update({ output: messages })
          .eq('id', runId);
        if (error) throw new Error(`persist-state turn ${turn}: ${error.message}`);
      });

      // 3d. Check for tool uses
      const toolUses = findToolUses(response.content);
      if (toolUses.length === 0) {
        finalText = extractFinalText(response.content);
        terminationStatus = 'completed';
        console.log(`[agent] runId=${runId} completed turn=${turn} toolCalls=${toolCalls}`);
        break;
      }

      // 3e. Execute each tool use
      const toolResults: ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        toolCalls++;
        const skill = getSkill(use.name);
        if (!skill) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: [{ type: 'text', text: `Error: unknown tool '${use.name}'` }],
            is_error: true,
          });
          continue;
        }

        // Validate input via Zod
        const parsed = skill.definition.inputZodSchema.safeParse(use.input);
        if (!parsed.success) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: [{ type: 'text', text: `Error: invalid input for ${use.name}: ${parsed.error.message}` }],
            is_error: true,
          });
          continue;
        }

        try {
          const execute = () => skill.handler(parsed.data, skillCtx);
          const result = skill.definition.isSideEffecting
            ? await maybeStep(step, `skill-${use.name}-${use.id}`, execute)
            : await execute();
          toolResults.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: [{ type: 'text', text: JSON.stringify(result) }],
          });
          console.log(`[agent] runId=${runId} tool=${use.name} ok`);
        } catch (skillErr) {
          const msg = skillErr instanceof Error ? skillErr.message : String(skillErr);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: [{ type: 'text', text: `Error: ${msg}` }],
            is_error: true,
          });
          console.error(`[agent] runId=${runId} tool=${use.name} failed: ${msg}`);
        }
      }

      // 3f. Push tool_result user message
      messages.push({ role: 'user', content: toolResults });

      // 3g. Persist after tool_results so a crash in the next Claude call
      // doesn't lose this turn's tool outputs from agent_runs.output —
      // upholds the "agent_runs.output is queryable mid-run" guarantee.
      await maybeStep(step, `persist-tool-results-${turn}`, async () => {
        const { error } = await supabase
          .from('agent_runs')
          .update({ output: messages })
          .eq('id', runId);
        if (error) throw new Error(`persist-tool-results turn ${turn}: ${error.message}`);
      });

      // If we hit MAX_TURNS while still receiving tool uses, all tools on
      // this final turn already executed — their side effects happened.
      // The 'failed' status reflects "didn't reach a final text response",
      // not "rolled back". Callers reading agent_runs.output will see the
      // full conversation including the unanswered final tool_result block.
      if (turn === MAX_TURNS) {
        terminationStatus = 'failed';
        terminationError = 'max_turns_exceeded';
        console.error(`[agent] runId=${runId} max_turns_exceeded (${MAX_TURNS})`);
      }
    }
  } catch (err) {
    terminationStatus = 'failed';
    terminationError = err instanceof Error ? err.message : String(err);
    Sentry.captureException(err, { extra: { runId, personaSlug, orgId } });
    console.error(`[agent] runId=${runId} error: ${terminationError}`);
  }

  // 4. Final state update
  await maybeStep(step, 'finalize-run', async () => {
    const update: Record<string, unknown> = {
      status: terminationStatus,
      completed_at: new Date().toISOString(),
      output: messages,
    };
    if (terminationError) update.error = terminationError;
    const { error } = await supabase.from('agent_runs').update(update).eq('id', runId);
    if (error) throw new Error(`finalize: ${error.message}`);
  });

  return {
    runId,
    status: terminationStatus,
    finalText,
    toolCalls,
    error: terminationError,
  };
}
