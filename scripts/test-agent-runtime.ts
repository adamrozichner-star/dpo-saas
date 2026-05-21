// Smoke test for the Phase 2 agent runtime. Invokes the runtime directly
// (no Inngest step) against Kreston with persona='dana' and a trivial
// user trigger. Verifies agent_runs row is created, status reaches
// 'completed' or 'failed' with a non-null error, and prints the run id so
// it can be inspected via SQL.
//
// READ-ONLY MODE: passes toolNames=['read_org_facts','read_scratchpad'] so
// the agent cannot write facts, scratchpad, or notifications during the
// smoke test. The runtime's capability gate (InvokeAgentParams.toolNames)
// enforces this.
//
// Run:
//   npm run test:agent
//
// Required env (must be in the shell before running):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

import { invokeAgent } from '../src/lib/agents/runtime';

const KRESTON_ORG_ID = '4b42a6e3-dac9-4191-9713-bb7f7b6cff70';
const PERSONA = 'dana';
const READ_ONLY_TOOLS = ['read_org_facts', 'read_scratchpad'];

async function main(): Promise<void> {
  console.log(`[smoke] invoking agent (read-only toolset: ${READ_ONLY_TOOLS.join(', ')})...`);
  const result = await invokeAgent({
    orgId: KRESTON_ORG_ID,
    personaSlug: PERSONA,
    trigger: {
      type: 'user',
      payload: { message: 'List org facts' },
    },
    step: null,
    toolNames: READ_ONLY_TOOLS,
  });

  console.log('\n[smoke] result:');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n[smoke] inspect with:');
  console.log(`  SELECT id, status, error, jsonb_array_length(output) AS msg_count`);
  console.log(`  FROM agent_runs WHERE id = '${result.runId}';`);

  if (result.status === 'completed') {
    console.log('\n[smoke] ✓ completed');
    process.exit(0);
  } else {
    console.log(`\n[smoke] ✗ failed: ${result.error ?? 'unknown'}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[smoke] crashed:', err);
  process.exit(1);
});
